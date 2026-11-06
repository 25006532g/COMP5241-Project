"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser, database, isAdmin } from "@/lib/learning-server";
import { findAccounts, type DirectoryState } from "@/lib/account-directory";
import type { ActionState } from "@/app/learning/actions";

export async function searchAccounts(_previous: DirectoryState, form: FormData): Promise<DirectoryState> {
  try {
    const user = await currentUser();
    if (!isAdmin(user)) return { error: "Administrator access required." };
    return await findAccounts(user, form.get("query"), form.get("page") ?? 1);
  } catch { return { error: "Could not search accounts. Check your session and search value, then retry." }; }
}

export async function updateAccount(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await currentUser();
    if (!isAdmin(actor)) return { error: "Administrator access required." };
    const id = z.uuid().parse(form.get("accountId"));
    const role = z.enum(["learner", "instructor"]).parse(form.get("role"));
    const aiAccess = form.get("aiAccess") === "on";
    const client = database();
    const { data, error } = await client.auth.admin.getUserById(id);
    if (error || !data?.user) return { error: "Account not found." };
    if (isAdmin(data.user) || actor.id === id) return { error: "Administrator accounts cannot be changed here." };
    if (aiAccess) {
      if (form.get("confirmAi") !== "on") return { error: "Confirm administrator consent review before approving external AI access." };
    }
    const { error: saveError } = await client.auth.admin.updateUserById(id, {
      app_metadata: { ...data.user.app_metadata, role, ai_access: aiAccess },
    });
    if (saveError) return { error: "Account changes could not be saved. Try again." };
    revalidatePath("/admin/accounts"); revalidatePath("/teaching"); revalidatePath("/reports");
    return { success: "Account permissions saved." };
  } catch { return { error: "Account changes failed. Check your session and selected role, then retry." }; }
}