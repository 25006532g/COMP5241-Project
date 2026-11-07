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
/** Questions after the introduction. The intro turn is extra. */
export const sessionQuestionCap = 7;
export const sessionItemCap = sessionQuestionCap + 1;
export const v2DailyAiLimit = 20;
/** Keywords used when AI rating is unavailable for the self-intro. */
export const introStrategyKeywords = [
  "name", "role", "studying", "experience", "project", "result", "impact",
  "strength", "interested", "contribute", "because", "team",
] as const;

function introStrategyBody(focus: string, pastCue: string, futureCue: string) {
  return [
    "Suggested one-minute self-intro strategy (Present → Past → Future). Use your real facts; do not invent metrics.",
    "",
    "1. Present — Identity & current focus",
    "• Greeting & name: \"Good morning/afternoon, I am [Name].\"",
    "• Current role/status: your title, company, or major field of study.",
    `• Core hook: one sentence on your primary expertise or day-to-day work (${focus}).`,
    "",
    "2. Past — Credibility & quantifiable impact",
    `• Proven results: one concrete outcome with a number when you can (${pastCue}).`,
    "• Key strengths: the capabilities you used to get that result.",
    "",
    "3. Future — Alignment & the pivot",
    `• The match: genuine interest in this role/programme (${futureCue}).`,
    "• Value proposition: how your background helps their needs.",
    "• Closing: hand the conversation back (for example, \"Happy to go deeper on any of that.\").",
    "",
    "Aim for about one minute (~100–130 words) covering all three parts.",
  ].join("\n");
}

/** Canonical intro strategy text shown after a session and used when rating the intro. */
export const v2IntroStrategies: Record<ProfileId, string> = {
  cs_degree: introStrategyBody(
    "courses, labs, or computing interests you focus on now",
    "a course project, hackathon, or assignment result",
    "why this degree or programme fits what you want to learn next",
  ),
  cs_master: introStrategyBody(
    "your preparation and the graduate topic you are pursuing",
    "an undergrad or industry project with a measurable outcome",
    "why master's study and this research or course direction",
  ),
  software_engineer: introStrategyBody(
    "the product area or stack you work in most",
    "shipping a feature, fixing reliability, or cutting delivery time",
    "the kind of engineering problems you want on this team",
  ),
  frontend_engineer: introStrategyBody(
    "UI, accessibility, or client performance work you own day to day",
    "improving UX metrics, load time, or design-system adoption",
    "the frontend craft and product experience you want to grow here",
  ),
  backend_engineer: introStrategyBody(
    "APIs, data, or services you design and operate",
    "latency, throughput, reliability, or cost improvements",
    "the systems and scale challenges you want to take on here",
  ),
  data_analyst: introStrategyBody(
    "the data domains, tools, or stakeholders you support",
    "a dashboard, model, or analysis that changed a decision",
    "the questions and decisions you want to help this team answer",
  ),
};

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
  inUse: "This question is open in a live interview. End that session before removing it.",
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
    comment: z.string().trim().min(1).max(800),
  }).strict()).max(sessionItemCap),
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

export function bridgePhrase(answer: string, focus: readonly string[]) {
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
  return phrase.length > 72 ? phrase.slice(0, 69).replace(/\s+\S*$/, "") : phrase;
}

const bridgeOpenings = [
  (phrase: string) => `You brought up ${phrase}. That is why I want to ask this next. `,
  (phrase: string) => `What you said about ${phrase} changes how I would probe this. `,
  (phrase: string) => `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} stood out, so I am following that thread. `,
  (phrase: string) => `I am staying with ${phrase}, because it shows a choice worth testing. `,
  (phrase: string) => `Hearing ${phrase} makes me want the reasoning behind it. `,
  (phrase: string) => `That point on ${phrase} is the link to the question I have next. `,
];

export function bridgeLead(answer: string, focus: readonly string[], random: () => number = Math.random) {
  const phrase = bridgePhrase(answer, focus);
  if (!phrase) return null;
  const index = Math.min(bridgeOpenings.length - 1, Math.floor(Math.abs(random()) * bridgeOpenings.length));
  return bridgeOpenings[index](phrase);
}

export function drawPrimary(ids: readonly string[], random: () => number = Math.random) {
  const unique = [...new Set(ids)];
  if (unique.length < 7) return null;
  const copy = [...unique];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy.slice(0, sessionQuestionCap);
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
    const bankOrder = new Map(input.relatedIds.map((id, index) => [id, index]));
    const ranked = detailed.map(question => ({ id: question.id, score: topicScore(input.answer ?? "", question) }))
      .sort((left, right) => right.score - left.score
        || (bankOrder.get(left.id) ?? input.relatedIds.length) - (bankOrder.get(right.id) ?? input.relatedIds.length));
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
  const sampleTokens = tokens(sample);
  const sampleWords = new Set(sampleTokens);
  const answerSet = new Set(answerWords);
  const overlap = answerWords.filter(word => sampleWords.has(word)).length;
  const hit = keywords.length > 0 && keywordHit(answer, keywords);
  const covered = keywords.filter(keyword => keywordHit(answer, [keyword]));
  const missingKeywords = keywords.filter(keyword => !keywordHit(answer, [keyword]));
  const missingSample = [...new Set(sampleTokens.filter(word => !answerSet.has(word)))].slice(0, 5);
  const clip = (text: string, max = 780) => text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
  const list = (parts: string[]) => parts.slice(0, 4).join(", ");
  const sampleHint = missingKeywords.length
    ? `Compared with the suggested answer, add ${list(missingKeywords)}.`
    : missingSample.length
      ? `Compared with the suggested answer, bring in ideas around ${list(missingSample)}.`
      : "Compared with the suggested answer, spell out the key trade-off or example in your own words.";
  const strength = covered.length
    ? `You already touched ${list(covered)}.`
    : overlap >= 2
      ? "You matched some wording from the suggested answer."
      : "Little of the suggested answer's core wording appears yet.";

  if (answerWords.length < 8) {
    return {
      band: "missed" as const,
      comment: clip(`This answer is too short to show the idea. ${sampleHint} Explain those points briefly so a reviewer can see your reasoning.`),
    };
  }
  if ((hit && overlap >= 1) || overlap >= 3) {
    return {
      band: "strong" as const,
      comment: clip(`${strength} That lines up with the suggested answer. ${missingKeywords.length || missingSample.length ? `${sampleHint} ` : ""}Say why it matters for this question so the answer stays complete under follow-up.`),
    };
  }
  if (hit || overlap >= 1 || answerWords.length >= 25) {
    return {
      band: "partial" as const,
      comment: clip(`${strength} ${sampleHint} Those points are in the suggested answer because they show you understand the trade-off, not only the label. Rewrite one sentence that links your point to them.`),
    };
  }
  return {
    band: "missed" as const,
    comment: clip(`${strength} ${sampleHint} Start from the suggested answer's main claim, then restate it with a short example of your own.`),
  };
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
