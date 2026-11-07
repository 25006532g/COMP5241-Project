import "server-only";
import { randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { database, currentUser } from "@/lib/learning-server";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { isAdmin, isInstructor } from "@/lib/permissions";
import { pickRelatedQuestion, rateAnswers, writeFollowUpLead } from "@/lib/interviews-v2-ai";
import {
  applyAiPick, bridgeLead, bridgePhrase, chooseAfterSkip, chooseNext, chooseReplacement, drawPrimary, importFileSchema, introBubble, introStrategyKeywords, keywordHit, localFeedback, profileIdSchema, topicScore, v2IntroStrategies, v2Profiles,
  type ProfileId, type V2Code, type V2TurnView, type V2View,
} from "@/lib/interviews-v2";

export type V2Result = { code: V2Code; view?: V2View };
type SessionRow = {
  id: string; owner_id: string; profile_id: ProfileId; state: V2View["session"]["state"]; revision: number;
  planned_ids: string[]; asked_ids: string[]; current_question_id: string | null; current_reason: "keyword" | "ai" | "none" | null;
  bridge_lead: string | null;
};
type QuestionRow = { id: string; profile_id: string; prompt: string; sample_answer: string; keywords: string[]; related_ids: string[]; kind: "primary" | "followup"; active: boolean; sort_order: number };
type TurnRow = { id: string; session_id: string; position: number; kind: "intro" | "question"; question_id: string | null; prompt: string; student_text: string | null; skipped: boolean; match_reason: V2TurnView["matchReason"] };

function staff(user: User) { return isAdmin(user) || isInstructor(user); }
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.startsWith("{")) return value.slice(1, -1).split(",").filter(Boolean).map(item => item.replaceAll("\"", ""));
  return [];
}
function asSession(row: SessionRow): SessionRow {
  return { ...row, revision: Number(row.revision), planned_ids: list(row.planned_ids), asked_ids: list(row.asked_ids) };
}
function asQuestion(row: QuestionRow): QuestionRow {
  return { ...row, keywords: list(row.keywords), related_ids: list(row.related_ids) };
}
async function actor() {
  return currentUser().catch(() => null);
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await database().rpc(name, args);
  let payload: unknown = data;
  if (typeof data === "string") {
    try { payload = JSON.parse(data); } catch { return { code: "unavailable" as const, session: null }; }
  }
  if (error || !payload || typeof payload !== "object" || typeof (payload as { code?: unknown }).code !== "string") return { code: "unavailable" as const, session: null as SessionRow | null };
  const row = payload as { code: string; session?: SessionRow };
  if (row.code === "ok" || row.code === "limit" || row.code === "invalid" || row.code === "missing" || row.code === "conflict" || row.code === "bank" || row.code === "inUse") {
    return { code: row.code as V2Code, session: row.session ? asSession(row.session) : null };
  }
  return { code: "unavailable" as const, session: null };
}

async function sessionRow(id: string) {
  const { data, error } = await database().from("forge_v2_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("session");
  return data ? asSession(data as SessionRow) : null;
}
async function turnsFor(id: string) {
  const { data, error } = await database().from("forge_v2_turns").select("*").eq("session_id", id).order("position");
  if (error || !Array.isArray(data)) throw new Error("turns");
  return data as TurnRow[];
}
async function questionMap(ids: string[]) {
  if (!ids.length) return new Map<string, QuestionRow>();
  const { data, error } = await database().from("forge_v2_questions").select("*").in("id", ids);
  if (error || !Array.isArray(data)) throw new Error("questions");
  return new Map((data as QuestionRow[]).map(row => [row.id, asQuestion(row)]));
}

export async function loadView(id: string, user: User): Promise<V2View | null> {
  const session = await sessionRow(id);
  if (!session || (session.owner_id !== user.id && !staff(user))) return null;
  const profile = v2Profiles[session.profile_id];
  const turns = await turnsFor(id);
  const { data: ratings, error } = await database().from("forge_v2_ratings").select("turn_id,band,comment").eq("session_id", id);
  if (error || !Array.isArray(ratings)) throw new Error("ratings");
  const ratingRows = ratings as { turn_id: string | null; band: V2TurnView["band"]; comment: string }[];
  const questions = await questionMap(turns.flatMap(turn => turn.question_id ? [turn.question_id] : []));
  const current = session.current_question_id ? (await questionMap([session.current_question_id])).get(session.current_question_id) : undefined;
  const summaryRow = ratingRows.find(row => row.turn_id == null);
  const summary = summaryRow?.comment ?? null;
  const followUp = session.state === "asking" && (session.current_reason === "keyword" || session.current_reason === "ai") ? session.current_reason : null;
  const previous = [...turns].reverse().find(turn => !turn.skipped && turn.student_text);
  const storedLead = followUp && session.bridge_lead?.trim() ? `${session.bridge_lead.trim()} ` : null;
  const lead = storedLead ?? (followUp && previous?.student_text ? bridgeLead(previous.student_text, current?.keywords ?? []) : null);
  const answered = turns.some(turn => !turn.skipped && turn.student_text);
  const ratingState: V2View["ratingState"] = session.state !== "complete" ? "pending" : summary ? "ready" : answered ? "unavailable" : "empty";
  const showSamples = session.state === "complete";
  let introSample: string | null = null;
  if (showSamples) {
    const rubric = await database().from("forge_v2_profiles").select("intro_rubric").eq("id", session.profile_id).maybeSingle();
    if (!rubric.error && typeof rubric.data?.intro_rubric === "string" && rubric.data.intro_rubric.trim()) {
      introSample = rubric.data.intro_rubric;
    } else {
      introSample = v2IntroStrategies[session.profile_id as ProfileId] ?? null;
    }
  }
  return {
    session: {
      id: session.id, ownerId: session.owner_id, profileId: session.profile_id, label: profile.label,
      interviewer: profile.interviewer, state: session.state, revision: session.revision, presented: turns.length,
    },
    followUp,
    bubble: session.state === "intro" ? introBubble : session.state === "asking" ? (current?.prompt ? `${lead ?? ""}${current.prompt}` : null) : null,
    wordTarget: session.state === "intro" ? 130 : null,
    turns: turns.map(turn => {
      const rating = ratingRows.find(row => row.turn_id != null && String(row.turn_id) === String(turn.id));
      return {
        id: turn.id, kind: turn.kind, prompt: turn.prompt, studentText: turn.student_text, skipped: turn.skipped,
        matchReason: turn.match_reason, band: rating?.band ?? null, comment: rating?.comment ?? null,
        sampleAnswer: !showSamples ? null : turn.kind === "intro" ? introSample : turn.question_id ? questions.get(turn.question_id)?.sample_answer ?? null : null,
      };
    }),
    summary, ratingState, canAnswer: session.owner_id === user.id && (session.state === "intro" || session.state === "asking"),
  };
}

async function finishRating(id: string, user: User, revision: number) {
  const session = await sessionRow(id);
  if (!session || session.state !== "rating") return;
  const turns = await turnsFor(id);
  const rateable = turns.filter(turn => !turn.skipped && turn.student_text);
  if (!rateable.length) {
    await rpc("forge_v2_complete_unrated", { p_owner: session.owner_id, p_id: id, p_revision: revision });
    return;
  }
  const profile = await database().from("forge_v2_profiles").select("intro_rubric").eq("id", session.profile_id).maybeSingle();
  const questions = await questionMap(rateable.flatMap(turn => turn.question_id ? [turn.question_id] : []));
  try {
    await requireAiAccess(user);
    const { data: claimed, error } = await database().rpc("forge_v2_claim_ai", { p_owner: session.owner_id });
    if (error || claimed !== true) throw new Error("quota");
    const rated = await rateAnswers(rateable.map(turn => ({
      turnId: turn.id,
      prompt: turn.prompt,
      sampleAnswer: turn.kind === "intro"
        ? String(profile.data?.intro_rubric || v2IntroStrategies[session.profile_id as ProfileId] || "Introduction")
        : questions.get(turn.question_id ?? "")?.sample_answer ?? "No sample answer",
      answer: turn.student_text ?? "",
    })));
    const ids = new Set(rateable.map(turn => turn.id));
    if (rated.items.length !== ids.size || rated.items.some(item => !ids.has(item.turnId))) throw new Error("rating shape");
    const stored = await rpc("forge_v2_store_ratings", {
      p_owner: session.owner_id, p_id: id, p_revision: revision, p_summary: rated.summary,
      p_items: rated.items.map(item => ({ turnId: item.turnId, band: item.band, comment: item.comment })),
    });
    if (stored.code !== "ok") throw new Error("rating was not saved");
  } catch {
    try {
      const items = rateable.map(turn => {
        const question = turn.question_id ? questions.get(turn.question_id) : undefined;
        const sample = turn.kind === "intro"
          ? String(profile.data?.intro_rubric || v2IntroStrategies[session.profile_id as ProfileId] || "Introduction")
          : question?.sample_answer ?? "No sample answer";
        const judged = localFeedback(
          turn.student_text ?? "",
          sample,
          turn.kind === "intro" ? introStrategyKeywords : question?.keywords ?? [],
        );
        return { turnId: turn.id, band: judged.band, comment: judged.comment };
      });
      const stored = await rpc("forge_v2_store_ratings", {
        p_owner: session.owner_id, p_id: id, p_revision: revision, p_summary: "Offline feedback compared each answer with its suggested answer and called out missing ideas. Use it as practice guidance, not a grade.",
        p_items: items,
      });
      if (stored.code !== "ok") throw new Error("fallback was not saved");
    } catch {
      await rpc("forge_v2_complete_unrated", { p_owner: session.owner_id, p_id: id, p_revision: revision });
    }
  }
}

async function resultFor(id: string, user: User, code: V2Code = "ok"): Promise<V2Result> {
  try {
    const view = await loadView(id, user);
    return view ? { code, view } : { code: "missing" };
  } catch { return { code: "unavailable" }; }
}

export async function startSession(input: unknown): Promise<V2Result> {
  const parsed = z.object({ profileId: profileIdSchema }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const { data, error } = await database().from("forge_v2_questions").select("id").eq("profile_id", parsed.data.profileId).eq("kind", "primary").eq("active", true);
  if (error || !Array.isArray(data)) return { code: "unavailable" };
  const planned = drawPrimary(data.map(row => String(row.id)));
  if (!planned) return { code: "bank" };
  const id = randomUUID();
  const started = await rpc("forge_v2_start", { p_owner: user.id, p_id: id, p_profile: parsed.data.profileId, p_planned: planned });
  if (started.code !== "ok") return { code: started.code };
  return resultFor(id, user);
}

export async function readSession(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  return resultFor(parsed.data.id, user);
}

async function ownedAsking(id: string, revision: number, user: User) {
  const session = await sessionRow(id);
  if (!session || session.owner_id !== user.id) return { code: "missing" as const, session: null, turns: [] as TurnRow[] };
  if (session.revision !== revision) return { code: "conflict" as const, session, turns: [] as TurnRow[] };
  const turns = await turnsFor(id);
  return { code: "ok" as const, session, turns };
}

export async function submitIntro(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid(), revision: z.number().int(), text: z.string().trim().min(1).max(4000) }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const owned = await ownedAsking(parsed.data.id, parsed.data.revision, user).catch(() => null);
  if (!owned) return { code: "unavailable" };
  if (owned.code !== "ok" || !owned.session || owned.session.state !== "intro") return { code: owned.code === "ok" ? "conflict" : owned.code };
  const first = owned.session.planned_ids[0];
  const saved = await rpc("forge_v2_save_intro", { p_owner: user.id, p_id: parsed.data.id, p_revision: parsed.data.revision, p_text: parsed.data.text, p_first: first });
  if (saved.code !== "ok") return { code: saved.code };
  return resultFor(parsed.data.id, user);
}

export async function skipIntro(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid(), revision: z.number().int() }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const owned = await ownedAsking(parsed.data.id, parsed.data.revision, user).catch(() => null);
  if (!owned) return { code: "unavailable" };
  if (owned.code !== "ok" || !owned.session || owned.session.state !== "intro") return { code: owned.code === "ok" ? "conflict" : owned.code };
  const first = owned.session.planned_ids[0];
  if (!first) return { code: "invalid" };
  const saved = await rpc("forge_v2_skip_intro", { p_owner: user.id, p_id: parsed.data.id, p_revision: parsed.data.revision, p_first: first });
  if (saved.code !== "ok") return { code: saved.code };
  return resultFor(parsed.data.id, user);
}

export async function changeQuestion(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid(), revision: z.number().int() }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const owned = await ownedAsking(parsed.data.id, parsed.data.revision, user).catch(() => null);
  if (!owned) return { code: "unavailable" };
  if (owned.code !== "ok" || !owned.session || owned.session.state !== "asking" || !owned.session.current_question_id) {
    return { code: owned.code === "ok" ? "conflict" : owned.code };
  }
  const current = (await questionMap([owned.session.current_question_id])).get(owned.session.current_question_id);
  const pool = await database().from("forge_v2_questions").select("id").eq("profile_id", owned.session.profile_id).eq("active", true);
  if (pool.error || !Array.isArray(pool.data)) return { code: "unavailable" };
  const nextId = chooseReplacement({
    currentId: owned.session.current_question_id,
    relatedIds: current?.related_ids ?? [],
    askedIds: owned.session.asked_ids ?? [],
    poolIds: pool.data.map(row => String(row.id)),
  });
  if (!nextId) return { code: "noAlternate" };
  const saved = await rpc("forge_v2_change_question", {
    p_owner: user.id, p_id: parsed.data.id, p_revision: parsed.data.revision, p_next: nextId,
  });
  if (saved.code !== "ok") return { code: saved.code };
  return resultFor(parsed.data.id, user);
}

export async function submitAnswer(input: unknown, skipped = false): Promise<V2Result> {
  const parsed = z.object({
    id: z.uuid(), revision: z.number().int(), text: z.string().trim().min(1).max(4000).optional(),
  }).safeParse(input);
  if (!parsed.success || (!skipped && !parsed.data.text)) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const owned = await ownedAsking(parsed.data.id, parsed.data.revision, user).catch(() => null);
  if (!owned) return { code: "unavailable" };
  if (owned.code !== "ok" || !owned.session || owned.session.state !== "asking" || !owned.session.current_question_id) {
    return { code: owned.code === "ok" ? "conflict" : owned.code };
  }
  const current = (await questionMap([owned.session.current_question_id])).get(owned.session.current_question_id);
  const asked = owned.session.asked_ids ?? [];
  const plannedRemaining = owned.session.planned_ids.filter(id => !asked.includes(id));
  const relatedById = await questionMap(current?.related_ids ?? []);
  const relatedRows = (current?.related_ids ?? [])
    .map(id => relatedById.get(id))
    .filter((row): row is QuestionRow => Boolean(row?.active && row.profile_id === owned.session?.profile_id));
  const relatedIds = relatedRows.map(row => row.id);
  const presentedAfter = owned.turns.length + 1;
  const answerText = parsed.data.text ?? "";
  let next = skipped || !current
    ? chooseAfterSkip({ presentedAfter, askedIds: asked, plannedRemaining })
    : chooseNext({
      presentedAfter, relatedIds, askedIds: asked, plannedRemaining,
      keywordMatched: keywordHit(answerText, current.keywords ?? []),
      answer: answerText,
      related: relatedRows.map(row => ({ id: row.id, prompt: row.prompt, keywords: row.keywords ?? [] })),
    });
  let claimedAi = false;
  if (!skipped && current && next.type === "ai") {
    const candidates = next.candidates;
    const fallback = relatedRows
      .filter(row => candidates.includes(row.id))
      .map((row, index) => ({ id: row.id, index, score: topicScore(answerText, { prompt: row.prompt, keywords: row.keywords ?? [] }) }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .find(row => row.score >= 1)?.id ?? null;
    let pick: string | null = null;
    try {
      await requireAiAccess(user);
      const { data: claimed, error } = await database().rpc("forge_v2_claim_ai", { p_owner: user.id });
      if (!error && claimed === true) {
        claimedAi = true;
        pick = await pickRelatedQuestion(current.prompt, answerText, relatedRows.filter(row => candidates.includes(row.id)).map(row => ({ id: row.id, prompt: row.prompt })));
      }
    } catch { pick = null; }
    next = applyAiPick(pick, next, asked, plannedRemaining, fallback);
  }
  let bridge: string | null = null;
  if (!skipped && next.type === "ask" && (next.reason === "keyword" || next.reason === "ai")) {
    const upcoming = (await questionMap([next.id])).get(next.id);
    const focus = upcoming?.keywords?.length ? upcoming.keywords : current?.keywords ?? [];
    const unit = [...answerText].reduce((hash, char) => (hash * 33 + char.charCodeAt(0)) >>> 0, 7) / 0xffffffff;
    bridge = bridgeLead(answerText, focus, () => unit);
    const phrase = bridgePhrase(answerText, focus);
    if (phrase && upcoming?.prompt) {
      try {
        await requireAiAccess(user);
        if (!claimedAi) {
          const { data: claimed, error } = await database().rpc("forge_v2_claim_ai", { p_owner: user.id });
          claimedAi = !error && claimed === true;
        }
        if (claimedAi) {
          const written = await writeFollowUpLead({ phrase, answer: answerText, nextPrompt: upcoming.prompt });
          if (written) bridge = written;
        }
      } catch { /* keep the varied local lead */ }
    }
  }
  const saved = await rpc("forge_v2_save_answer", {
    p_owner: user.id, p_id: parsed.data.id, p_revision: parsed.data.revision,
    p_text: skipped ? null : parsed.data.text, p_skipped: skipped,
    p_next: next.type === "ask" ? next.id : null,
    p_next_reason: next.type === "ask" ? (next.reason === "planned" ? "none" : next.reason) : null,
    p_lead: bridge,
  });
  if (saved.code !== "ok") return { code: saved.code };
  if (next.type !== "ask" && saved.session) await finishRating(parsed.data.id, user, saved.session.revision);
  return resultFor(parsed.data.id, user);
}

export async function skipQuestion(input: unknown) { return submitAnswer(input, true); }

export async function endSession(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid(), revision: z.number().int() }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const ended = await rpc("forge_v2_end", { p_owner: user.id, p_id: parsed.data.id, p_revision: parsed.data.revision });
  if (ended.code !== "ok" || !ended.session) return { code: ended.code };
  if (ended.session.state === "rating") await finishRating(parsed.data.id, user, ended.session.revision);
  return resultFor(parsed.data.id, user);
}

const questionWrite = z.object({
  id: z.uuid(), profileId: profileIdSchema, prompt: z.string().trim().min(1).max(2000),
  sampleAnswer: z.string().trim().min(1).max(4000), keywords: z.array(z.string().trim().min(1).max(40)).max(12),
  relatedIds: z.array(z.uuid()).max(8), kind: z.enum(["primary", "followup"]), active: z.boolean(), sortOrder: z.number().int().min(0).max(1000),
}).strict();

async function requireStaff() {
  const user = await actor();
  if (!user) return { user: null, code: "auth" as const };
  if (!staff(user)) return { user, code: "denied" as const };
  return { user, code: "ok" as const };
}

export async function deleteQuestion(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const access = await requireStaff();
  if (access.code !== "ok") return { code: access.code };
  const removed = await rpc("forge_v2_delete_question", { p_id: parsed.data.id });
  return { code: removed.code };
}

export async function saveQuestion(input: unknown): Promise<V2Result> {
  const parsed = questionWrite.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  if (new Set(parsed.data.keywords.map(keyword => keyword.toLocaleLowerCase())).size !== parsed.data.keywords.length) return { code: "invalid" };
  const access = await requireStaff();
  if (access.code !== "ok") return { code: access.code };
  const saved = await rpc("forge_v2_save_question", {
    p_id: parsed.data.id, p_profile: parsed.data.profileId, p_prompt: parsed.data.prompt, p_sample: parsed.data.sampleAnswer,
    p_keywords: parsed.data.keywords, p_related: parsed.data.relatedIds, p_kind: parsed.data.kind, p_active: parsed.data.active, p_sort: parsed.data.sortOrder,
  });
  return { code: saved.code };
}

export async function importQuestions(input: unknown): Promise<V2Result> {
  const parsed = importFileSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const access = await requireStaff();
  if (access.code !== "ok") return { code: access.code };
  const saved = await rpc("forge_v2_import_questions", { p_profile: parsed.data.profile, p_questions: parsed.data.questions });
  return { code: saved.code };
}

export async function saveRubric(input: unknown): Promise<V2Result> {
  const parsed = z.object({ profileId: profileIdSchema, rubric: z.string().trim().min(1).max(2000) }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const access = await requireStaff();
  if (access.code !== "ok") return { code: access.code };
  const saved = await rpc("forge_v2_save_rubric", { p_profile: parsed.data.profileId, p_rubric: parsed.data.rubric });
  return { code: saved.code };
}

export async function deleteSession(input: unknown): Promise<V2Result> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await actor();
  if (!user) return { code: "auth" };
  const removed = await rpc("forge_v2_delete_session", { p_owner: user.id, p_id: parsed.data.id });
  return { code: removed.code };
}

export async function listMine() {
  const user = await actor();
  if (!user) return { code: "auth" as const, rows: [] };
  const { data, error } = await database().from("forge_v2_sessions").select("id,profile_id,state,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20);
  if (error || !Array.isArray(data)) return { code: "unavailable" as const, rows: [] };
  return { code: "ok" as const, rows: data as { id: string; profile_id: ProfileId; state: string; created_at: string }[] };
}

export async function listBank() {
  const access = await requireStaff();
  if (access.code !== "ok" || !access.user) return { code: access.code, questions: [], sessions: [], profiles: [] as { id: ProfileId; intro_rubric: string }[] };
  const client = database();
  const [questions, sessions, profiles] = await Promise.all([
    client.from("forge_v2_questions").select("id,profile_id,prompt,sample_answer,keywords,related_ids,kind,active,sort_order").order("sort_order"),
    client.from("forge_v2_sessions").select("id,owner_id,profile_id,state,created_at").order("created_at", { ascending: false }).limit(50),
    client.from("forge_v2_profiles").select("id,intro_rubric"),
  ]);
  if (questions.error || sessions.error || profiles.error || !Array.isArray(questions.data) || !Array.isArray(sessions.data) || !Array.isArray(profiles.data)) {
    return { code: "unavailable" as const, questions: [], sessions: [], profiles: [] };
  }
  const owners = [...new Set(sessions.data.map(row => String(row.owner_id)))];
  const names = owners.length ? await client.from("profiles").select("id,display_name").in("id", owners) : { data: [], error: null };
  const nameOf = new Map((Array.isArray(names.data) ? names.data : []).map(row => [String(row.id), String(row.display_name ?? "Learner")]));
  return {
    code: "ok" as const,
    questions: questions.data as QuestionRow[],
    profiles: profiles.data as { id: ProfileId; intro_rubric: string }[],
    sessions: sessions.data.map(row => ({ ...row, learner: nameOf.get(String(row.owner_id)) ?? "Learner" })),
  };
}
