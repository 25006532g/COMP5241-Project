"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accessibleLesson, canManageEnrollment, canPublishLessons, currentUser, database } from "@/lib/learning-server";
import { findAccounts, type DirectoryState } from "@/lib/account-directory";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { startGeneration } from "@/lib/lesson-generation-server";
import { extractTeachingMaterial } from "@/lib/teaching-material";
import type { ActionState } from "@/app/learning/actions";
import { selectionFromForm } from "@/lib/curriculum";

export async function searchLearners(_previous: DirectoryState, form: FormData): Promise<DirectoryState> {
  try {
    const user = await currentUser();
    const lesson = await accessibleLesson(z.uuid().parse(form.get("lessonId")), user);
    if (!lesson || !canManageEnrollment(user, lesson)) return { error: "You cannot manage enrollment for this lesson." };
    return await findAccounts(user, form.get("query"), form.get("page") ?? 1, true);
  } catch { return { error: "Learner search failed. Check your session and search value, then retry." }; }
}

export async function enrollSelected(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    const id = z.uuid().parse(form.get("lessonId"));
    const lesson = await accessibleLesson(id, user);
    if (!lesson || !canManageEnrollment(user, lesson)) return { error: "You cannot manage enrollment for this lesson." };
    const selected = [...new Set(z.array(z.uuid()).min(1).max(50).parse(form.getAll("learnerId")))];
    const client = database();
    for (let offset = 0; offset < selected.length; offset += 10) {
      const accounts = await Promise.all(selected.slice(offset, offset + 10).map(accountId => client.auth.admin.getUserById(accountId)));
      if (accounts.some(result => result.error || !result.data.user?.email_confirmed_at || canPublishLessons(result.data.user))) {
        return { error: "Select only existing, email-verified learner accounts. No enrollments were changed." };
      }
    }
    const { error } = await client.from("forge_enrollments").upsert(selected.map(accountId => ({
      user_id: accountId, lesson_id: id, enrollment_kind: "public",
    })), { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    if (error) return { error: "Enrollment failed. Please retry; existing enrollments are preserved." };
    revalidatePath("/teaching"); revalidatePath("/reports"); revalidatePath("/dashboard"); revalidatePath("/catalog");
    return { success: `Enrollment confirmed for ${selected.length} selected learner(s). Existing progress is unchanged.` };
  } catch { return { error: "Choose between 1 and 50 learners and try again." }; }
}

export async function extractLessonUpload(form: FormData): Promise<{ text?: string; name?: string; error?: string }> {
  try {
    await currentUser();
    const file = form.get("material");
    if (!(file instanceof File)) return { error: "Choose a file to upload." };
    const text = await extractTeachingMaterial(file);
    const name = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 120);
    return { text: text.slice(0, 20_000), name: name || "Uploaded lesson" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that file. Try again." };
  }
}

export async function importTeachingMaterial(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!canPublishLessons(user)) return { error: "Instructor access required." };
    await requireAiAccess(user);
    if (form.get("consent") !== "on") return { error: "Confirm that the material is permitted to be sent for AI processing." };
    const topic = z.string().trim().min(5).max(500).parse(form.get("topic"));
    const selection = selectionFromForm(form);
    const file = form.get("material");
    if (!(file instanceof File)) return { error: "Choose a teaching file." };
    const source = await extractTeachingMaterial(file);
    if (source.length > 20000) return { error: "This material contains more than 20,000 characters. Upload a shorter section; no content was sent to AI." };
    const confirmed = await currentUser();
    if (confirmed.id !== user.id || !canPublishLessons(confirmed)) return { error: "Your session or instructor permission changed. Reload before importing." };
    const state = await startGeneration({ id: z.uuid().parse(form.get("generationId")), kind: "import", objective: topic, selection, source });
    return state.draft ? { generationId: state.draft.id, success: "Extracted reference saved privately. Resume to generate; no AI call has been made." } :
      { error: state.error, ...(state.uncertain ? { saveUncertain: true as const } : {}) };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Choose a consistent curriculum subject/topic, complete the metadata, and enter a learning objective between 5 and 500 characters." };
    return { error: error instanceof Error ? error.message : "Material import failed. Try again." };
  }
}