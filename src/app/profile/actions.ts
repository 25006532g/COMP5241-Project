"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { publicConfig } from "@/lib/public-config";
import { ageRangeFor, isDemoAge } from "@/lib/eligibility";

export type ProfileState = {
  error?: string;
  fields?: { displayName: string; age: string; level: string; subjects: string; goals: string };
  fieldErrors?: Record<string, string>;
};

export async function updateProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const fields = {
    displayName: String(formData.get("displayName") ?? "").slice(0, 100),
    age: String(formData.get("age") ?? ""),
    level: String(formData.get("level") ?? ""),
    subjects: String(formData.get("subjects") ?? "").slice(0, 300),
    goals: String(formData.get("goals") ?? "").slice(0, 800),
  };
  const result = z.object({ displayName: z.string().trim().min(2).max(100), age: z.coerce.number().refine(isDemoAge, "Enter a whole-number age from 13 to 120."), level: z.enum(["new", "foundation", "intermediate", "advanced"]), subjects: z.string().max(300), goals: z.string().max(800), setupRevision: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(2147483646)) }).safeParse(Object.fromEntries(formData));
  if (!result.success) return { fields, fieldErrors: Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]), issue.message])), error: "Please check the highlighted profile fields." };
  let avatar: string | null | undefined;
  const image = formData.get("avatar");
  if (formData.get("removeAvatar") === "on") avatar = null;
  else if (image instanceof File && image.size) {
    try {
      if (image.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(image.type)) throw new Error("Invalid image");
      const processor = sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: 20_000_000 });
      const metadata = await processor.metadata();
      if (!["jpeg", "png"].includes(metadata.format ?? "")) throw new Error("Invalid image");
      const buffer = await processor.rotate().resize(160, 160, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      avatar = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch { return { fields, error: "Choose a valid JPG or PNG under 2 MB and 20 megapixels." }; }
  }
  try {
    const supabase = await createClient();
    const authentication = await supabase.auth.getUser();
    if (authentication?.error !== null || !authentication?.data?.user?.id) return { fields, error: "Your session could not be verified. Log in again before saving." };
    const user = authentication.data.user;
    const { data: existing, error: profileError } = await supabase.from("profiles").select("age, age_range, learning_setup_revision").eq("id", user.id).maybeSingle();
    if (profileError !== null) return { fields, error: "Could not verify your profile. Please try again later." };
    if (!existing) return { fields, error: "Your profile is missing. Contact support before saving. Account export and deletion remain available." };
    if (existing.learning_setup_revision !== result.data.setupRevision) return { fields, error: "A newer profile or diagnostic change was found. Reload your saved profile and compare before saving. Your draft is still here." };
    if (existing?.age_range === "under-13" || (typeof existing?.age === "number" && existing.age < 13)) {
      return { fields, error: "This account needs administrator review under the 13+ supervised demo policy. Account export and deletion remain available." };
    }
    const { data: saved, error } = await supabase.from("profiles").update({ display_name: result.data.displayName, age: result.data.age, age_range: ageRangeFor(result.data.age), learning_level: result.data.level, preferred_subjects: result.data.subjects.split(",").map(item => item.trim()).filter(Boolean), learning_goals: result.data.goals, ...(avatar !== undefined ? { avatar_url: avatar } : {}), updated_at: new Date().toISOString() }).eq("id", user.id).eq("learning_setup_revision", result.data.setupRevision).select("id").maybeSingle();
    if (error !== null) return { fields, error: "Could not confirm that your profile was saved. Reload your saved profile and compare before retrying." };
    if (!saved) return { fields, error: "A newer profile or diagnostic change was found. Reload your saved profile and compare before saving. Your draft is still here." };
    if (saved.id !== user.id) return { fields, error: "Could not confirm that your profile was saved. Reload your saved profile and compare before retrying." };
  } catch {
    return { fields, error: "Could not confirm that your profile was saved. Reload your saved profile and compare before retrying." };
  }
  revalidatePath("/profile");
  redirect("/profile?success=Profile%20updated%20successfully.");
}

export async function deleteAccount(formData: FormData) {
  if (formData.get("confirm") !== "on") redirect("/profile/delete?error=Confirm%20that%20you%20understand%20this%20action.");
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!password.success) redirect("/profile/delete?error=Enter%20your%20current%20password.");
  const authFailure = `/profile/delete?error=${encodeURIComponent("Could not verify your account. Please try again later.")}`;
  let supabase;
  let authentication;
  try {
    supabase = await createClient({ requireCookieWrites: true });
    authentication = await supabase.auth.getUser();
    if (!authentication?.data || authentication.error === undefined) throw new Error();
  } catch {
    redirect(authFailure);
  }
  const { data: { user }, error: authError } = authentication;
  if (authError) {
    const unavailable = authError.status === 429 || (authError.status ?? 0) >= 500;
    if (!unavailable && (authError.status === 401 || authError.name === "AuthSessionMissingError" ||
      ["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "user_not_found", "bad_jwt"].includes(authError.code ?? ""))) redirect("/login");
    redirect(authFailure);
  }
  if (!user?.id) redirect("/login");
  if (!user.email) redirect(`/profile/delete?error=${encodeURIComponent("Could not verify this account for password-confirmed deletion. Contact support.")}`);
  const passwordFailure = `/profile/delete?error=${encodeURIComponent("Could not verify your password. Please try again later.")}`;
  let reauthentication;
  try {
    reauthentication = await supabase.auth.signInWithPassword({ email: user.email, password: password.data });
    if (!reauthentication?.data || reauthentication.error === undefined) throw new Error();
  } catch {
    redirect(passwordFailure);
  }
  const { data: { user: verifiedUser }, error: passwordError } = reauthentication;
  if (passwordError) {
    if (passwordError.code === "invalid_credentials" && passwordError.status !== 429 && (passwordError.status ?? 0) < 500) {
      redirect("/profile/delete?error=The%20password%20could%20not%20be%20verified.");
    }
    redirect(passwordFailure);
  }
  if (!verifiedUser?.id || verifiedUser.id !== user.id) redirect(`/login?error=${encodeURIComponent("Could not verify the same account. Log in again before requesting deletion.")}`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) redirect("/profile/delete?error=Account%20deletion%20is%20not%20configured%20yet.");
  let admin;
  try {
    admin = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  } catch {
    redirect(`/profile/delete?error=${encodeURIComponent("Account deletion is temporarily unavailable. Please try again later.")}`);
  }
  try {
    // Same-account password verification above remains mandatory. Remove blobs
    // before auth cascades lose the metadata needed to retry private cleanup.
    const {cleanupPresentationAssets}=await import("@/lib/presentation-assets-server");
    await cleanupPresentationAssets(user.id,true);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error !== null) throw error;
  } catch {
    redirect("/profile/delete?error=Could%20not%20confirm%20account%20deletion.%20Check%20whether%20you%20can%20still%20log%20in%20before%20retrying%2C%20or%20contact%20support.");
  }
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error !== null) throw error;
  } catch {
    redirect(`/login?error=${encodeURIComponent("Your account was deleted, but we could not confirm browser-session cleanup. Clear site cookies before using this device again.")}`);
  }
  redirect("/login?success=Your%20account%20and%20learning%20data%20were%20deleted.");
}

export type EmailChangeState = {
  email: string;
  code: "invalid" | "auth" | "unavailable" | "rejected" | "unknown" | "sent";
  message: string;
};

export async function changeEmail(_previous: EmailChangeState | null, formData: FormData): Promise<EmailChangeState> {
  const email = String(formData.get("email") ?? "").slice(0, 254);
  const reply = (code: EmailChangeState["code"], message: string): EmailChangeState => ({ email, code, message });
  const result = z.email().safeParse(formData.get("email"));
  if (!result.success) return reply("invalid", "Enter a valid email address.");
  let supabase;
  try { supabase = await createClient(); }
  catch { return reply("unavailable", "Email changes are temporarily unavailable. No request was sent."); }
  try {
    const authentication = await supabase.auth.getUser();
    if (authentication?.error !== null) {
      const error = authentication?.error;
      if (error?.status === 401 || error?.name === "AuthSessionMissingError") return reply("auth", "Log in again before requesting an email change. No request was sent.");
      return reply("unavailable", "Could not verify your account right now. No email-change request was sent.");
    }
    if (!authentication?.data?.user?.id) return reply("auth", "Log in again before requesting an email change. No request was sent.");
  } catch { return reply("unavailable", "Could not verify your account right now. No email-change request was sent."); }
  const settings = publicConfig(process.env);
  if (!settings) return reply("unavailable", "Email changes are temporarily unavailable. No request was sent.");
  const uncertain = () => reply("unknown", "Could not confirm whether the email-change request was accepted. Check your current and new inboxes and account before trying again. This request will not be automatically replayed.");
  try {
    const response = await supabase.auth.updateUser({ email: result.data }, { emailRedirectTo: `${settings.siteOrigin}/auth/confirm?next=/profile` });
    if (!response || response.error === undefined) return uncertain();
    if (response.error) {
      if (response.error.status && response.error.status < 500) return reply("rejected", "The email-change request was not accepted. Check the address or try again later.");
      return uncertain();
    }
    if (!response.data?.user?.id) return uncertain();
  } catch { return uncertain(); }
  return reply("sent", "Check your current and new email inboxes to confirm the change.");
}