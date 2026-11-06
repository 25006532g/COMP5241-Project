import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser, database, canPublishLessons } from "@/lib/learning-server";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { curriculumSelectionSchema, type CurriculumSelection } from "@/lib/curriculum";
import { assembleLesson, generationSchema, generationSummarySchema, type Generation, type GenerationState } from "@/lib/lesson-generation";
import { generateLessonPart } from "@/lib/lesson-generation-ai";

const messages: Record<string, string> = {
  missing: "This saved draft is unavailable or deleted.",
  deleted: "This draft was deleted. Its start ID cannot be reused.",
  conflict: "The saved draft changed. Reload saved state before continuing.",
  busy: "Another generation request is still in flight. Pause, wait for its 90-second lease, then reload.",
  attempts: "This stage has used its three explicit attempts. Keep or delete the draft; no further inference is allowed.",
  limit: "Saved draft limit reached (10 unfinished, 100 retained start identities). Delete unneeded draft content or use manual authoring.",
  quota: "Your five daily generation starts have been used. Resuming saved parts does not use another start.",
  invalid: "The lesson part did not meet the saved lesson requirements. Saved parts are unchanged.",
};

function safeFailure(error: unknown): GenerationState {
  if (error instanceof z.ZodError) return { error: "Choose consistent curriculum metadata and a learning objective of 5–500 characters." };
  // Only deliberately constructed local errors escape; no raw provider/database errors.
  return { error: error instanceof GenerationError ? error.message : "The operation could not be confirmed. Reload saved state before retrying.", uncertain: !(error instanceof GenerationError), ...(error instanceof GenerationError && error.missing ? { missing: true } : {}) };
}
class GenerationError extends Error {
  constructor(message: string, readonly missing = false) { super(message); }
}

export async function generationRpc(name: string, owner: string, args: Record<string, unknown>) {
  const { data, error } = await database().rpc(name, { p_owner: owner, ...args });
  if (error || !data || typeof data.code !== "string") {
    if (error && ["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code ?? "")) {
      throw new GenerationError("Saved generation storage is unavailable. Apply the lesson-generation migration and refresh the schema cache; no monolithic fallback is used.");
    }
    throw new Error("Unconfirmed generation write");
  }
  if (data.code !== "ok" && data.code !== "replay") throw new GenerationError(messages[data.code] ?? "The saved draft operation was rejected. Reload before continuing.");
  const draft = data.draft ? generationSchema.parse(data.draft) : undefined;
  if (draft && draft.owner_id !== owner) throw new Error("Owner mismatch");
  return { draft, replay: data.code === "replay" };
}

async function owned(owner: string, id: string): Promise<Generation> {
  const { data, error } = await database().from("forge_lesson_generations").select("*").eq("owner_id", owner).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new GenerationError("Saved generation storage is unavailable. Check the lesson-generation migration and reload.");
  if (!data) throw new GenerationError(messages.missing, true);
  const row = generationSchema.parse(data);
  if (row.owner_id !== owner) throw new Error("Owner mismatch");
  return row;
}
async function access(user: Awaited<ReturnType<typeof currentUser>>, kind: Generation["kind"]) {
  if (kind === "import" && !canPublishLessons(user)) throw new GenerationError("Instructor access is required to change or generate imported drafts.");
  try { await requireAiAccess(user); }
  catch { throw new GenerationError("External AI requires administrator-approved AI access."); }
}
async function confirm(owner: string, kind: Generation["kind"]) {
  const user = await currentUser();
  if (user.id !== owner) throw new GenerationError("Your session changed. The new part was not saved. Reload with the original account.");
  await access(user, kind);
}

export async function startGeneration(input: { id: string; kind: Generation["kind"]; objective: string; selection: CurriculumSelection; source?: string }): Promise<GenerationState> {
  try {
    const user = await currentUser();
    await access(user, input.kind);
    const id = z.uuid().parse(input.id);
    const objective = z.string().trim().min(5).max(500).parse(input.objective);
    const selection = curriculumSelectionSchema.parse(input.selection);
    const source = z.string().trim().min(1).max(20000).optional().parse(input.source);
    if (input.kind !== "studio" && input.kind !== "import" || input.kind === "studio" && source) throw new GenerationError("Invalid draft source.");
    return await generationRpc("forge_generation_start", user.id, { p_id: id, p_kind: input.kind, p_objective: objective, p_selection: selection, p_source: source ?? null });
  } catch (error) { return safeFailure(error); }
}
export async function readGeneration(id: string): Promise<GenerationState> {
  try { const user = await currentUser(); return { draft: await owned(user.id, z.uuid().parse(id)) }; }
  catch (error) { return safeFailure(error); }
}
export async function listGenerations(): Promise<GenerationState> {
  try {
    const user = await currentUser();
    const { data, error } = await database().from("forge_lesson_generations").select("id,owner_id,kind,objective,revision,lesson_id,part_count").eq("owner_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }).order("id").limit(100);
    if (error || !Array.isArray(data)) throw new GenerationError("Saved generation storage is unavailable. Check the lesson-generation migration.");
    if (data.some(row => row.owner_id !== user.id)) throw new Error("Owner mismatch");
    const drafts = data.map(row => generationSummarySchema.parse(row));
    return { drafts };
  } catch (error) { return safeFailure(error); }
}
export async function deleteGeneration(id: string): Promise<GenerationState> {
  try {
    const user = await currentUser();
    // Read/delete intentionally need no AI approval or instructor role.
    await generationRpc("forge_generation_delete", user.id, { p_id: z.uuid().parse(id) });
    return { deleted: true };
  } catch (error) { return safeFailure(error); }
}
export async function advanceGeneration(id: string, revision: number, request: string): Promise<GenerationState> {
  let reserved: Generation | undefined;
  let token: string | undefined;
  let owner: string | undefined;
  try {
    const user = await currentUser(); owner = user.id;
    const draft = await owned(user.id, z.uuid().parse(id));
    await access(user, draft.kind);
    token = randomUUID();
    const reservation = await generationRpc("forge_generation_reserve", user.id, {
      p_id: draft.id, p_revision: z.number().int().positive().parse(revision), p_request: z.uuid().parse(request), p_token: token,
    });
    if (reservation.replay) return reservation; // NEVER repeat inference on replay/response loss.
    reserved = reservation.draft;
    if (!reserved) throw new Error("Missing reservation");
    // Reservation awaits a database round trip: permissions/session may have
    // changed since the first check. Recheck before sending any reference to AI.
    await confirm(user.id, reserved.kind);
    const part = await generateLessonPart(reserved);
    await confirm(user.id, reserved.kind);
    return await generationRpc("forge_generation_settle", user.id, { p_id: draft.id, p_token: token, p_part: part });
  } catch (error) {
    // Do not retry inference. A known failure may mark its reservation failed, but only
    // while the original account still has current permissions. Otherwise it expires.
    if (reserved && owner && token) {
      try {
        await confirm(owner, reserved.kind);
        await generationRpc("forge_generation_settle", owner, { p_id: reserved.id, p_token: token, p_part: null });
      } catch { /* Unknown/late/deleted/session-changed: reconcile by read, never overwrite. */ }
    }
    if (error instanceof GenerationError) return safeFailure(error);
    return { error: "This part failed or its save acknowledgement was lost. Load saved state first; no automatic retry was made.", uncertain: true };
  }
}
export async function finalizeGeneration(id: string, revision: number): Promise<GenerationState> {
  try {
    const user = await currentUser();
    const draft = await owned(user.id, z.uuid().parse(id));
    // Finalization does not call AI, but import mutation still requires instructor role.
    if (draft.kind === "import" && !canPublishLessons(user)) throw new GenerationError("Instructor access is required to finalize an imported draft.");
    assembleLesson(draft);
    return await generationRpc("forge_generation_finalize", user.id, { p_id: draft.id, p_revision: z.number().int().positive().parse(revision) });
  } catch (error) { return safeFailure(error); }
}
