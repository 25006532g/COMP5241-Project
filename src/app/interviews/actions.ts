"use server";

import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/learning-server";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { interviewReply } from "@/lib/interview-ai";
import { interviewHistory, interviewRpc, ownedInterview } from "@/lib/interviews-server";
import { assistantTextSchema, createInterviewSchema, finishInterviewSchema, historyCursorSchema, interviewIdSchema, turnRequestSchema, type InterviewResult } from "@/lib/interviews";

function rejection(code: string): InterviewResult {
  if (code === "missing" || code === "conflict" || code === "busy" || code === "quota" || code === "limit" || code === "stale") return { code };
  return { code: "reserve_failed" };
}
async function turnAuthorization(owner: string): Promise<"auth" | "denied" | null> {
  const user = await currentUser().catch(() => null);
  if (!user) return "auth";
  if (user.id !== owner) return "denied";
  try { await requireAiAccess(user); } catch { return "denied"; }
  return null;
}
export async function listInterviews(cursor: unknown = null) {
  const parsed = historyCursorSchema.safeParse(cursor);
  if (!parsed.success) return { code: "invalid" as const };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" as const };
  try { return { code: "ok" as const, ...await interviewHistory(user.id, parsed.data) }; }
  catch { return { code: "unavailable" as const }; }
}
export async function readInterview(input: unknown): Promise<InterviewResult> {
  const parsed = interviewIdSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try {
    const interview = await ownedInterview(user.id, parsed.data.id);
    return interview ? { code: "ok", interview } : { code: "missing" };
  } catch { return { code: "unavailable" }; }
}
export async function createInterview(input: unknown): Promise<InterviewResult> {
  const parsed = createInterviewSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { await requireAiAccess(user); } catch { return { code: "denied" }; }
  try {
    const result = await interviewRpc("forge_interview_create", {
      p_id: parsed.data.id, p_topic: parsed.data.topic, p_level: parsed.data.level,
    }, user.id);
    return result.code === "ok" && result.interview ? { code: "ok", interview: result.interview } : rejection(result.code);
  } catch { return { code: "create_unknown" }; }
}
export async function requestInterviewTurn(input: unknown): Promise<InterviewResult> {
  const parsed = turnRequestSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { await requireAiAccess(user); } catch { return { code: "denied" }; }
  const owner = user.id;
  const request = parsed.data;
  let reserved;
  try {
    reserved = await interviewRpc("forge_interview_reserve", {
      p_id: request.id, p_revision: request.revision, p_request: request.requestId,
      p_turn: request.turnId, p_mode: request.mode, p_text: request.mode === "answer" ? request.text : null,
      p_token: randomUUID(),
    }, owner);
  } catch { return { code: "reserve_unknown" }; }
  if (reserved.code === "replay" && reserved.interview) return { code: "replay", interview: reserved.interview };
  if (reserved.code !== "reserved" || !reserved.interview) return rejection(reserved.code);
  const row = reserved.interview;
  const attempt = row.turns.at(-1)!.attempts.at(-1)!;
  let text: string | null = null;
  try { text = assistantTextSchema.parse(await interviewReply(row)); } catch { /* fixed persisted failure, no fallback */ }
  const saveDenial = await turnAuthorization(owner);
  // Do not mutate or release the captured row after authorization loss.
  // The saved pending attempt remains recoverable via its existing 75-second lease.
  if (saveDenial) return { code: saveDenial };
  let result;
  try {
    result = await interviewRpc("forge_interview_finalize", {
      p_id: row.id, p_revision: row.revision, p_token: attempt.token, p_text: text,
    }, owner);
  } catch { /* unconfirmed save; never release provider text */ }
  const releaseDenial = await turnAuthorization(owner);
  if (releaseDenial) return { code: releaseDenial };
  if (!result) return { code: "save_unknown" };
  if (result.code === "ok" && result.interview) return { code: text === null ? "saved_failed" : "ok", interview: result.interview };
  return { code: "stale" };
}
export async function finishInterview(input: unknown): Promise<InterviewResult> {
  const parsed = finishInterviewSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try {
    const result = await interviewRpc("forge_interview_finish", { p_id: parsed.data.id, p_revision: parsed.data.revision }, user.id);
    return result.code === "ok" && result.interview ? { code: "ok", interview: result.interview } : rejection(result.code);
  } catch { return { code: "finish_unknown" }; }
}
export async function deleteInterview(input: unknown): Promise<InterviewResult> {
  const parsed = interviewIdSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try {
    const result = await interviewRpc("forge_interview_delete", { p_id: parsed.data.id }, user.id);
    return result.code === "deleted" ? { code: "deleted" } : { code: "missing" };
  } catch { return { code: "delete_unknown" }; }
}
