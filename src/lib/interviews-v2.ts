import { z } from "zod";

export const v2Profiles = {
  cs_degree: { label: "Computer Science degree applicant", interviewer: "professor" },
  cs_master: { label: "Computer Science master's applicant", interviewer: "professor" },
  software_engineer: { label: "Software engineer", interviewer: "senior" },
  frontend_engineer: { label: "Frontend engineer", interviewer: "senior" },
  backend_engineer: { label: "Backend engineer", interviewer: "senior" },
  data_analyst: { label: "Data analyst", interviewer: "senior" },
} as const;
export const profileIdSchema = z.enum(Object.keys(v2Profiles) as [keyof typeof v2Profiles, ...Array<keyof typeof v2Profiles>]);
export type ProfileId = z.infer<typeof profileIdSchema>;
export const introBubble = "First, please introduce yourself in about one minute.";
export const introWordTarget = 130;
export const sessionItemCap = 11;
export const v2DailyAiLimit = 20;

export const v2Notices = {
  ok: "Saved.",
  auth: "Please log in again.",
  denied: "Only an instructor or administrator can edit the question bank.",
  invalid: "That interview request was not valid.",
  missing: "Interview not found.",
  conflict: "This interview changed. Reload it before continuing.",
  bank: "This profile needs at least 7 active primary questions before a session can start.",
  limit: "A profile can have at most 40 active questions.",
  unavailable: "Interview simulator v2 is unavailable. Try again later.",
  aiDenied: "Rating and related-question selection need a recorded adult age (18+) and administrator-approved AI access. Keyword follow-ups still work.",
  empty: "Nothing was sent, so there is nothing to rate.",
  unrated: "The session is saved. AI rating was unavailable, so no score was invented.",
  noAlternate: "There is no other question to switch to.",
} as const;
export type V2Code = keyof typeof v2Notices;

const questionInput = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  kind: z.enum(["primary", "followup"]),
  prompt: z.string().trim().min(1).max(2000),
  sampleAnswer: z.string().trim().min(1).max(4000),
  keywords: z.array(z.string().trim().min(1).max(40)).max(12),
  relatedKeys: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/)).max(8),
}).strict();
export const importFileSchema = z.object({
  profile: profileIdSchema,
  questions: z.array(questionInput).min(1).max(40),
}).strict().superRefine((file, ctx) => {
  const keys = new Set<string>();
  for (const question of file.questions) {
    if (keys.has(question.key)) ctx.addIssue({ code: "custom", message: "Duplicate question key" });
    keys.add(question.key);
    if (new Set(question.keywords.map(keyword => keyword.toLocaleLowerCase())).size !== question.keywords.length) {
      ctx.addIssue({ code: "custom", message: "Duplicate keyword" });
    }
    if (new Set(question.relatedKeys).size !== question.relatedKeys.length || question.relatedKeys.includes(question.key)) {
      ctx.addIssue({ code: "custom", message: "Invalid related question" });
    }
    for (const related of question.relatedKeys) {
      if (!file.questions.some(candidate => candidate.key === related)) ctx.addIssue({ code: "custom", message: "Unknown related question" });
    }
  }
});

export const ratingSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  items: z.array(z.object({
    turnId: z.uuid(),
    band: z.enum(["strong", "partial", "missed"]),
    comment: z.string().trim().min(1).max(400),
  }).strict()).max(11),
}).strict();

export function wordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function keywordHit(answer: string, keywords: readonly string[]) {
  const text = answer.toLocaleLowerCase();
  return keywords.some(keyword => {
    const needle = keyword.trim().toLocaleLowerCase();
    if (!needle) return false;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u").test(text);
  });
}

const stemEnding = /^(s|es|ed|ing|er|ers|ion|ions|al|ly)?$/;
function sameStem(word: string, keyword: string) {
  const left = word.toLocaleLowerCase();
  const right = keyword.toLocaleLowerCase();
  if (left === right) return true;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  if (shorter.length < 5 || !longer.startsWith(shorter)) return false;
  return stemEnding.test(longer.slice(shorter.length));
}

/** Looser than keywordHit: whole words, short phrases, and simple inflections such as scale/scaling. */
export function topicHit(answer: string, phrases: readonly string[]) {
  const words = answer.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return phrases.some(phrase => {
    const parts = phrase.trim().toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!parts.length) return false;
    if (keywordHit(answer, [phrase])) return true;
    return words.some(word => parts.some(part => sameStem(word, part)));
  });
}

const promptStop = new Set("about would could should there their these those which where while using explain describe compare design discuss example approach practical implement outline ensure decide write given tell time your what have with from into that this they them been being make made like just very really other each both some such over after before between across around based first second third without within through someone something project question answer interview company please might does doing give walk when than then also only more most under versus against during every always never thing things good well high level levels later next last keep want work working works role team teams".split(" "));

export function topicScore(answer: string, question: { prompt: string; keywords: readonly string[] }) {
  const keywords = question.keywords.map(keyword => keyword.trim()).filter(Boolean);
  const promptWords = question.prompt.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 5 && !promptStop.has(word));
  const keywordHits = keywords.filter(keyword => topicHit(answer, [keyword])).length;
  const promptHits = promptWords.filter(word => topicHit(answer, [word])).length;
  return keywordHits * 3 + Math.min(promptHits, 3);
}

const bridgeFiller = new Set("and also rely on the a an to for of so with when that this would use using into from your just really very about been doing have has was were".split(" "));

export function bridgeLead(answer: string, focus: readonly string[]) {
  const text = answer.replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean);
  if (words.length < 3) return null;
  const bare = words.map(word => word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""));
  let at = -1;
  let span = 1;
  for (const phrase of focus) {
    const parts = phrase.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!parts.length) continue;
    for (let index = 0; index < bare.length; index += 1) {
      if (parts.every((part, offset) => bare[index + offset] && sameStem(bare[index + offset], part))) {
        at = index;
        span = parts.length;
        break;
      }
    }
    if (at >= 0) break;
  }
  const previous = at > 0 ? bare[at - 1] : "";
  const start = at >= 0 && previous.length >= 4 && !bridgeFiller.has(previous) ? at - 1 : Math.max(at, 0);
  const slice = at >= 0 ? words.slice(start, at + span) : words.slice(0, 8);
  const phrase = slice.join(" ").replace(/^(i would|i'd|i have|i've|we would|we)\s+/i, "").replace(/[.!?,;:]+$/g, "").trim();
  if (phrase.length < 4) return null;
  const clipped = phrase.length > 72 ? phrase.slice(0, 69).replace(/\s+\S*$/, "") : phrase;
  return /\b(doing|building|using|working|writing|designing|been)\b/i.test(clipped)
    ? `As you said you have been ${clipped}, `
    : `Since you mentioned ${clipped}, `;
}

export function drawPrimary(ids: readonly string[], random: () => number = Math.random) {
  const unique = [...new Set(ids)];
  if (unique.length < 7) return null;
  const copy = [...unique];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  const count = 7 + Math.floor(random() * (Math.min(10, copy.length) - 7 + 1));
  return copy.slice(0, count);
}

export type Advance =
  | { type: "ask"; id: string; reason: "keyword" | "ai" | "planned" }
  | { type: "ai"; candidates: string[] }
  | { type: "rate" };

export function chooseNext(input: {
  presentedAfter: number;
  relatedIds: readonly string[];
  askedIds: readonly string[];
  plannedRemaining: readonly string[];
  keywordMatched: boolean;
  answer?: string;
  related?: readonly { id: string; prompt: string; keywords: readonly string[] }[];
}): Advance {
  if (input.presentedAfter >= sessionItemCap) return { type: "rate" };
  const freshIds = input.relatedIds.filter(id => !input.askedIds.includes(id));
  const detailed = (input.related ?? []).filter(question => !input.askedIds.includes(question.id) && (freshIds.length === 0 || freshIds.includes(question.id)));
  if (input.answer && detailed.length) {
    const ranked = detailed.map(question => ({ id: question.id, score: topicScore(input.answer ?? "", question) }))
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    const best = ranked[0];
    if (best && best.score >= 2) return { type: "ask", id: best.id, reason: "keyword" };
    if (input.keywordMatched && best) return { type: "ask", id: best.id, reason: "keyword" };
    const touched = ranked.filter(question => question.score >= 1);
    if (touched.length) return { type: "ai", candidates: touched.map(question => question.id) };
  }
  if (input.keywordMatched && freshIds[0]) return { type: "ask", id: freshIds[0], reason: "keyword" };
  if (!input.keywordMatched && freshIds.length) return { type: "ai", candidates: freshIds };
  const next = input.plannedRemaining.find(id => !input.askedIds.includes(id));
  return next ? { type: "ask", id: next, reason: "planned" } : { type: "rate" };
}

export function chooseReplacement(input: {
  currentId: string;
  relatedIds: readonly string[];
  askedIds: readonly string[];
  poolIds: readonly string[];
  random?: () => number;
}) {
  const random = input.random ?? Math.random;
  const pool = new Set(input.poolIds);
  const asked = new Set(input.askedIds);
  const pick = (ids: string[]) => {
    if (!ids.length) return null;
    const index = Math.min(ids.length - 1, Math.floor(random() * ids.length));
    return ids[index] ?? null;
  };
  const related = [...new Set(input.relatedIds)].filter(id => id !== input.currentId && pool.has(id) && !asked.has(id));
  const relatedPick = pick(related);
  if (relatedPick) return relatedPick;
  const fresh = [...new Set(input.poolIds.filter(id => id !== input.currentId && !asked.has(id)))];
  const freshPick = pick(fresh);
  if (freshPick) return freshPick;
  return pick([...new Set(input.poolIds.filter(id => id !== input.currentId))]);
}

export function localFeedback(answer: string, sample: string, keywords: readonly string[]) {
  const tokens = (value: string) => value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 3);
  const answerWords = tokens(answer);
  const sampleWords = new Set(tokens(sample));
  const overlap = answerWords.filter(word => sampleWords.has(word)).length;
  const hit = keywords.length > 0 && keywordHit(answer, keywords);
  if (answerWords.length < 8) {
    return { band: "missed" as const, comment: "This answer is too short to show the idea. Expand it using the suggested answer as a guide." };
  }
  if ((hit && overlap >= 1) || overlap >= 3) {
    return { band: "strong" as const, comment: "The answer covers the main idea. Check the suggested answer for any point you skipped." };
  }
  if (hit || overlap >= 1 || answerWords.length >= 25) {
    return { band: "partial" as const, comment: "Part of the expected point is there. The suggested answer shows what to add." };
  }
  return { band: "missed" as const, comment: "This does not cover the expected point yet. Read the suggested answer and explain it in your own words." };
}

export function chooseAfterSkip(input: { presentedAfter: number; askedIds: readonly string[]; plannedRemaining: readonly string[] }): Advance {
  if (input.presentedAfter >= sessionItemCap) return { type: "rate" };
  const next = input.plannedRemaining.find(id => !input.askedIds.includes(id));
  return next ? { type: "ask", id: next, reason: "planned" } : { type: "rate" };
}

export function applyAiPick(pick: string | null, choice: Extract<Advance, { type: "ai" }>, askedIds: readonly string[], plannedRemaining: readonly string[], localId?: string | null): Advance {
  if (pick && choice.candidates.includes(pick) && !askedIds.includes(pick)) return { type: "ask", id: pick, reason: "ai" };
  if (localId && choice.candidates.includes(localId) && !askedIds.includes(localId)) return { type: "ask", id: localId, reason: "keyword" };
  const next = plannedRemaining.find(id => !askedIds.includes(id));
  return next ? { type: "ask", id: next, reason: "planned" } : { type: "rate" };
}

export type V2TurnView = {
  id: string;
  kind: "intro" | "question";
  prompt: string;
  studentText: string | null;
  skipped: boolean;
  matchReason: "keyword" | "ai" | "none" | null;
  band: "strong" | "partial" | "missed" | null;
  comment: string | null;
  sampleAnswer: string | null;
};
export type V2View = {
  session: {
    id: string;
    ownerId: string;
    profileId: ProfileId;
    label: string;
    interviewer: "professor" | "senior";
    state: "intro" | "asking" | "rating" | "complete";
    revision: number;
    presented: number;
  };
  followUp: "keyword" | "ai" | null;
  bubble: string | null;
  wordTarget: number | null;
  turns: V2TurnView[];
  summary: string | null;
  ratingState: "pending" | "ready" | "unavailable" | "empty";
  canAnswer: boolean;
};
