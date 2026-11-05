"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accessibleLesson, currentUser, database, enrolledLesson, isAdmin, canEditLesson, canPublishLessons } from "@/lib/learning-server";
import { coachReply } from "@/lib/openrouter";
import { startGeneration } from "@/lib/lesson-generation-server";
import { coachSlides, isPresentation, gradeQuiz, lessonSchema, versionEvidence, type VersionEvidence } from "@/lib/learning";
import { presentationResumeSchema,resumeSchema, type ResumeState } from "@/lib/resume";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { FAMILIES, readMetadata, selectionFromForm, subjectSelection, validateCurriculumContent } from "@/lib/curriculum";
import { authorLessonSchema, toStoredLesson,toPresentationLesson } from "@/lib/slide-lesson";
import type {PresentationAuthor} from "@/lib/presentation";

export type ActionState = { error?: string; progress?: VersionEvidence; saveUncertain?: true; generationId?: string; success?: string; lessonId?: string; version?: number; attemptId?: string; score?: number; feedback?: { prompt: string; correct: string; explanation: string }[] };

function failure(error: unknown): ActionState {
  if (error instanceof z.ZodError) return { error: `Please check ${error.issues[0]?.path.join(".") || "your input"}: ${error.issues[0]?.message ?? "Invalid input."}` };
  if (error instanceof SyntaxError) return { error: "The lesson content could not be read. Please reload the editor." };
  return { error: error instanceof Error ? error.message : "The request failed. Please try again." };
}

function uncertainCreation(): ActionState {
  return { saveUncertain: true, error: "Save outcome is unknown. This lesson may already exist. Your input is retained here. Check your owned lessons before creating another copy." };
}
async function readPresentationDraft(form:FormData,raw:unknown,user:Awaited<ReturnType<typeof currentUser>>,lesson?:Awaited<ReturnType<typeof accessibleLesson>>):Promise<PresentationAuthor|null>{
  if(form.get("template")!=="slides"||form.get("format")!=="presentation")return null;
  const [{presentationAuthorSchema},{validatePresentationAssets}]=await Promise.all([import("@/lib/presentation"),import("@/lib/presentation-assets-server")]);
  const draft=presentationAuthorSchema.parse(raw);
  await validatePresentationAssets(draft.document,form.get("draftId"),user,lesson??undefined);
  return draft;
}
async function bindImageDraft(form:FormData,userId:string,lessonId:string) {
  if(!form.get("draftId"))return;
  const {bindPresentationDraft}=await import("@/lib/presentation-assets-server");
  await bindPresentationDraft(form.get("draftId"),userId,lessonId);
}

function creationAcknowledgement(data: { id?: unknown } | null, error: { code?: string } | null): ActionState | null {
  // Only definite statement/schema rejections prove that retrying cannot duplicate a row.
  // Response-shaping and transport failures can happen after commit.
  if (error) {
    if (!data && error.code === "23514") return { error: "The database rejected the lesson CHECK constraint (23514). Ask the administrator to check and apply 20261105093000_slide_authoring_ran.sql and, for presentations, 20261105140000_presentations_ran.sql as needed, then refresh the Supabase schema cache. Nothing was saved; your input is retained." };
    if (!data && ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")) {
      return { error: "Lesson storage is unavailable. Check the learning database migrations and schema cache, then try again. Nothing was saved." };
    }
    if (!data && ["23502", "23503", "23505", "23514", "42501", "22001"].includes(error.code ?? "")) {
      return { error: "The database rejected this creation. Your input is retained. Check the lesson requirements and your permissions before retrying." };
    }
    return uncertainCreation();
  }
  return z.uuid().safeParse(data?.id).success ? null : uncertainCreation();
}

export async function createLesson(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const state = await startGeneration({
      id: z.uuid().parse(form.get("generationId")), kind: "studio",
      objective: z.string().trim().min(5).max(500).parse(form.get("topic")), selection: selectionFromForm(form),
    });
    return state.draft ? { generationId: state.draft.id, success: "Draft saved. Resume to generate one part at a time." } :
      { error: state.error, ...(state.uncertain ? { saveUncertain: true as const } : {}) };
  } catch (error) { return failure(error); }
}

export async function enroll(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    const id = z.uuid().parse(form.get("lessonId"));
    const lesson = await accessibleLesson(id, user);
    if (!lesson) throw new Error("Lesson not available.");
    const { error } = await database().from("forge_enrollments").upsert({ user_id: user.id, lesson_id: id, enrollment_kind: lesson.visibility }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    if (error) throw new Error("Enrollment failed. Please try again.");
    revalidatePath(`/courses/${id}`); revalidatePath("/dashboard");
    return { success: "Enrollment confirmed.", lessonId: id };
  } catch (error) { return failure(error); }
}

export async function saveBookmark(id: string, saved: boolean): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!await accessibleLesson(z.uuid().parse(id), user)) throw new Error("Lesson not available.");
    const client = database();
    const result = saved
      ? await client.from("forge_bookmarks").upsert({ user_id: user.id, lesson_id: id }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true })
      : await client.from("forge_bookmarks").delete().eq("user_id", user.id).eq("lesson_id", id);
    if (result.error) throw new Error("Could not update your bookmark.");
    revalidatePath("/progress");
    return { success: saved ? "Lesson saved." : "Bookmark removed." };
  } catch (error) { return failure(error); }
}

async function acknowledgeProgress(id: string, version: number, kind: "reviewed_at" | "attended_at"): Promise<ActionState> {
  try {
    const user = await currentUser();
    const lesson = await enrolledLesson(z.uuid().parse(id), user);
    if (lesson.version !== z.number().int().positive().parse(version)) throw new Error("This lesson has been updated. Reload before recording evidence.");
    const unknown = { error: `${kind === "reviewed_at" ? "Review" : "Attendance"} acknowledgement is unconfirmed; it may have saved. Retry safely for this version, or reload if the lesson changed.` };
    try {
      const { data, error } = await database().rpc("forge_record_progress", {
        request_user: user.id, request_lesson: id, expected_version: version, evidence_kind: kind,
      });
      const parsed = z.object({
        version: z.literal(version), reviewedAt: z.iso.datetime({ offset: true }).nullable(), attendedAt: z.iso.datetime({ offset: true }).nullable(),
      }).safeParse(data);
      if (error || !parsed.success || !(kind === "reviewed_at" ? parsed.data.reviewedAt : parsed.data.attendedAt)) return unknown;
      revalidatePath("/progress"); revalidatePath("/dashboard"); revalidatePath(`/courses/${id}`);
      return { progress: parsed.data, success: kind === "reviewed_at" ? "Review acknowledgement saved." : "Attendance recorded." };
    } catch { return unknown; }
  } catch (error) { return failure(error); }
}

export async function reviewLesson(id: string, version: number): Promise<ActionState> {
  return acknowledgeProgress(id, version, "reviewed_at");
}

export async function attend(id: string, version: number): Promise<ActionState> {
  return acknowledgeProgress(id, version, "attended_at");
}

export async function submitQuiz(id: string, version: number, answers: number[]): Promise<ActionState> {
  try {
    const user = await currentUser();
    const lesson = await enrolledLesson(z.uuid().parse(id), user);
    if (lesson.version !== version) throw new Error("This lesson has been updated. Reload the lesson before taking the quiz.");
    if (!lesson.content.questions.length) throw new Error("This lesson has no quiz or quiz certificate.");
    const { data: enrollment, error: enrollmentError } = await database().from("forge_enrollments").select("progress_evidence").eq("user_id", user.id).eq("lesson_id", id).single();
    if (enrollmentError || !versionEvidence(enrollment, version).attendedAt) throw new Error("Reach the final quiz for this lesson version before submitting.");
    const result = gradeQuiz(lesson.content.questions, answers);
    const unknown = "Quiz save is unconfirmed; it may have saved. Check quiz history before retrying.";
    let attemptId: string;
    try {
      const { data, error } = await database().from("forge_attempts").insert({
        user_id: user.id, lesson_id: id, original_lesson_id: id, lesson_title: lesson.title, lesson_version: lesson.version,
        certificate_kind: lesson.visibility, lesson_template: lesson.content.template ?? "standard", answers: result.answers, questions: lesson.content.questions, score: result.score,
      }).select("id").single();
      if (error || !z.uuid().safeParse(data?.id).success) throw new Error(unknown);
      attemptId = data.id;
    } catch { throw new Error(unknown); }
    revalidatePath("/progress"); revalidatePath("/dashboard");
    return { version: lesson.version, score: result.score, attemptId, success: result.passed ? "Passed. Your certificate is ready." : "Keep practicing. You can retry as often as you need.", feedback: lesson.content.questions.map(question => ({ prompt: question.prompt, correct: question.options[question.correct], explanation: question.explanation })) };
  } catch (error) { return failure(error); }
}

export async function updateLesson(_previous: ActionState, form: FormData): Promise<ActionState> {
  if (_previous.saveUncertain) return uncertainCreation();
  let writeAttempted = false;
  try {
    const user = await currentUser();
    const id = z.uuid().parse(form.get("lessonId"));
    const lesson = await accessibleLesson(id, user, true);
    if (!lesson || !canEditLesson(user, lesson)) throw new Error("You cannot edit this lesson.");
    const slideDraft = form.get("template") === "slides";
    if (lesson.content.template === "slides" && !slideDraft) throw new Error("Use the slide editor to save this lesson.");
    const native=slideDraft && form.get("format")==="presentation";
    if(isPresentation(lesson.content)&&!native)throw new Error("Use the presentation editor to save this lesson.");
    const raw=JSON.parse(String(form.get("content")));
    const draft=await readPresentationDraft(form,raw,user,lesson);
    const content = validateCurriculumContent(draft?toPresentationLesson(draft):slideDraft ? toStoredLesson(authorLessonSchema.parse(raw)) : lessonSchema.parse(raw));
    const expectedVersion = z.coerce.number().int().positive().parse(form.get("version"));
    const publish = !slideDraft && form.get("publish") === "on";
    const requestPublication = slideDraft && form.get("intent") === "publish";
    if (publish && !canPublishLessons(user)) throw new Error("Instructor access is required to publish lessons.");
    const client = database();
    writeAttempted = true;
    const { data, error } = await client.from("forge_lessons").update({
      title: content.title, subject: content.subject, summary: content.summary, content, version: expectedVersion + 1,
      visibility: publish ? "public" : slideDraft ? "private" : lesson.visibility,
      ...(slideDraft ? { published_at: null, review_requested: requestPublication } : publish ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", id).eq("version", expectedVersion).select("id").maybeSingle();
    if (error) return creationAcknowledgement(null, error) ?? uncertainCreation();
    writeAttempted = false;
    if (!data) throw new Error("This lesson changed in another session. Reload before editing.");
    if (data.id !== id) return uncertainCreation();
    if(draft) {writeAttempted=true;await bindImageDraft(form,user.id,id);writeAttempted=false;}
    revalidatePath("/catalog"); revalidatePath(`/courses/${id}`); revalidatePath("/admin"); revalidatePath("/studio");
    return { success: requestPublication ? "Saved and sent to an administrator for approval." : publish ? "Reviewed lesson published." : "Lesson saved.", lessonId: id, version: expectedVersion + 1 };
  } catch (error) { return writeAttempted ? uncertainCreation() : failure(error); }
}

// Separate from authoring: every slides-template author, including admins, must
// request review first. Approval never trusts submitted content or publish flags.
export async function approveSlideLesson(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!isAdmin(user)) throw new Error("Administrator approval required.");
    const id = z.uuid().parse(form.get("lessonId"));
    const version = z.coerce.number().int().positive().parse(form.get("version"));
    const lesson = await accessibleLesson(id, user, true);
    if (!lesson || lesson.content.template !== "slides" || !lesson.review_requested) throw new Error("This lesson is not awaiting slide publication review.");
    const { data, error } = await database().from("forge_lessons").update({
      visibility: "public", published_at: new Date().toISOString(), review_requested: false,
    }).eq("id", id).eq("version", version).eq("review_requested", true).eq("visibility", "private").select("id").maybeSingle();
    if (error || !data) throw new Error("Publication not confirmed. Reload the review queue to check the current version.");
    for (const path of ["/studio", "/admin", "/catalog", `/courses/${id}`]) revalidatePath(path);
    return { success: "Administrator-reviewed lesson published.", lessonId: id, version };
  } catch (error) { return failure(error); }
}

export async function addReviewer(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!isAdmin(user)) throw new Error("Administrator access required.");
    const lessonId = z.uuid().parse(form.get("lessonId"));
    const reviewerId = z.uuid().parse(form.get("reviewerId"));
    const lesson = await accessibleLesson(lessonId, user, true);
    if (lesson?.visibility !== "public") throw new Error("Only published lessons can have reviewers.");
    const { error } = await database().from("forge_reviewers").upsert({ lesson_id: lessonId, user_id: reviewerId });
    if (error) throw new Error("Could not grant access. Check the registered user's ID.");
    revalidatePath("/admin"); revalidatePath("/reports");
    return { success: "Results reviewer added." };
  } catch (error) { return failure(error); }
}

export async function removeReviewer(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!isAdmin(user)) throw new Error("Administrator access required.");
    const lessonId = z.uuid().parse(form.get("lessonId"));
    const reviewerId = z.uuid().parse(form.get("reviewerId"));
    const { error } = await database().from("forge_reviewers").delete().eq("lesson_id", lessonId).eq("user_id", reviewerId);
    if (error) throw new Error("Could not revoke report access.");
    revalidatePath("/admin"); revalidatePath("/reports");
    return { success: "Report access revoked." };
  } catch (error) { return failure(error); }
}

export async function requestReview(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await currentUser();
    const id = z.uuid().parse(form.get("lessonId"));
    const { data, error } = await database().from("forge_lessons").update({ review_requested: true }).eq("id", id).eq("owner_id", user.id).eq("visibility", "private").select("id").maybeSingle();
    if (error || !data) throw new Error("Could not submit this private lesson for review.");
    revalidatePath("/admin");
    return { success: "Submitted. Administrators can now review this lesson for publication." };
  } catch (error) { return failure(error); }
}

export async function createManualLesson(_previous: ActionState, form: FormData): Promise<ActionState> {
  if (_previous.saveUncertain) return uncertainCreation();
  let insertAttempted = false;
  try {
    const user = await currentUser();
    const slideDraft = form.get("template") === "slides";
    const raw=JSON.parse(String(form.get("content")));
    const draft=await readPresentationDraft(form,raw,user);
    const content = validateCurriculumContent(draft?toPresentationLesson(draft):slideDraft ? toStoredLesson(authorLessonSchema.parse(raw)) : lessonSchema.parse(raw));
    const publish = !slideDraft && form.get("publish") === "on";
    const requestPublication = slideDraft && form.get("intent") === "publish";
    if (publish && !canPublishLessons(user)) throw new Error("Instructor access required to publish.");
    const client = database();
    insertAttempted = true;
    const { data, error } = await client.from("forge_lessons").insert({ owner_id: user.id, title: content.title, subject: content.subject, summary: content.summary, content, visibility: publish ? "public" : "private", review_requested: requestPublication, published_at: publish ? new Date().toISOString() : null }).select("id").single();
    const rejected = creationAcknowledgement(data, error);
    if (rejected) return rejected;
    if(draft)await bindImageDraft(form,user.id,data!.id);
    revalidatePath("/catalog"); revalidatePath("/dashboard"); revalidatePath("/studio"); revalidatePath("/admin");
    return { success: requestPublication ? "Saved and sent to an administrator for approval." : slideDraft ? "Lesson saved." : "Lesson created.", lessonId: data!.id, version: 1 };
  } catch (error) {
    // Even a thrown database error may arrive after commit. Also covers a failure after
    // insertion but before the server can finish acknowledging the action.
    return insertAttempted ? uncertainCreation() : failure(error);
  }
}

export async function askCoach(id: string, history: unknown): Promise<{ reply?: string; error?: string }> {
  try {
    const user = await currentUser();
    await requireAiAccess(user);
    const lesson = await enrolledLesson(z.uuid().parse(id), user);
    const selection = subjectSelection(lesson.subject);
    if (!selection || subjectSelection(lesson.content.subject)?.family !== selection.family) throw new Error("This lesson is outside the approved coaching curriculum.");
    const topic = readMetadata(lesson.subject, lesson.content.metadata)?.topic ?? selection.topic;
    const messages = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).min(1).max(12).parse(history);
    if (messages.at(-1)?.role !== "user") throw new Error("Enter a question for your coach.");
    const referenceSlides=coachSlides(lesson.content);
    if(JSON.stringify(referenceSlides).length>24000)throw new Error("This presentation is too large for text coaching. Use its readable outline instead.");
    const { data: allowed, error } = await database().rpc("forge_claim_coach_request", { request_user: user.id });
    if (error) throw new Error("Coach service unavailable. Check the database migration.");
    if (!allowed) throw new Error("Your shared 15/day text-AI quota (coach and interviews) has been reached. Lessons and quizzes remain available.");
    const reply = await coachReply({ subject: FAMILIES[selection.family], topic, slides: referenceSlides,
      ...(isPresentation(lesson.content)?{format:"presentation"}:{}) }, messages);
    await requireAiAccess(await currentUser());
    return { reply };
  } catch (error) { return failure(error); }
}

export async function saveResume(id: string, version: number, revision: number, state: ResumeState): Promise<{ revision?: number; error?: string; conflict?: boolean }> {
  try {
    const user = await currentUser();
    const lesson = await enrolledLesson(z.uuid().parse(id), user);
    if (lesson.version !== version) return { error: "This lesson changed. Reload to start at the updated version.", conflict: true };
    z.number().int().min(0).parse(revision);
    const progress = (isPresentation(lesson.content)?presentationResumeSchema:resumeSchema).parse(state);
    if (progress.answers.length !== lesson.content.questions.length ||
      lesson.content.template === "slides" && (progress.stage === "activity" || !lesson.content.questions.length && progress.stage === "quiz")) throw new Error("Invalid lesson stage or answer count.");
    if (progress.slide >= lesson.content.slides.length || progress.ordering.length !== lesson.content.activity.steps.length || new Set(progress.ordering).size !== progress.ordering.length || progress.ordering.some(index => index >= progress.ordering.length)) throw new Error("Invalid lesson position.");
    const client = database();
    const values = { lesson_version: version, lesson_template: lesson.content.template ?? "standard",lesson_format:isPresentation(lesson.content)?"presentation":"legacy",slide_count:lesson.content.slides.length, question_count: lesson.content.questions.length, stage: progress.stage, slide: progress.slide, ordering: progress.ordering, answers: progress.answers, updated_at: new Date().toISOString() };
    if (revision === 0) {
      const { data, error } = await client.from("forge_resume").insert({ user_id: user.id, lesson_id: id, ...values }).select("revision").single();
      if (error?.code === "23505") return { error: "Progress changed on another device. Reload before continuing.", conflict: true };
      if (error || !data) throw new Error("Could not save progress.");
      return { revision: data.revision };
    }
    const { data, error } = await client.from("forge_resume").update({ ...values, revision: revision + 1 }).eq("user_id", user.id).eq("lesson_id", id).eq("revision", revision).select("revision").maybeSingle();
    if (error) throw new Error("Could not save progress.");
    if (!data) return { error: "Progress changed on another device. Reload before continuing.", conflict: true };
    return { revision: data.revision };
  } catch {
    return { error: "Could not save progress. Try again when your connection is restored." };
  }
}