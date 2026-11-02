import { z } from "zod";

export const interviewTopics = {
  technical: "Technical / problem-solving",
  projects: "Project discussion",
  teamwork: "Teamwork / behavioural",
  planning: "SDLC: planning",
  requirements: "SDLC: requirements",
  design: "SDLC: design",
  implementation: "SDLC: implementation",
  testing: "SDLC: testing",
  deployment: "SDLC: deployment",
  maintenance: "SDLC: maintenance",
  delegation: "AI coding agents: task specification and delegation",
  boundaries: "AI coding agents: context and permission boundaries",
  verification: "AI coding agents: output verification and code review",
  prioritization: "Software/product skills: prioritization and trade-offs",
  communication: "Software/product skills: stakeholder and team communication",
} as const;
export const topicSchema = z.enum(Object.keys(interviewTopics) as [keyof typeof interviewTopics, ...Array<keyof typeof interviewTopics>]);
export const levelSchema = z.enum(["new", "foundation", "intermediate", "advanced"]);
const uuid = z.uuid();
const revision = z.number().int().min(1).max(1000);
const timestamp = z.iso.datetime({ offset: true });
export const assistantTextSchema = z.string().trim().min(1).max(1600);
const answer = z.string().trim().min(1).max(1200);
const attemptSchema = z.object({
  request_id: uuid, token: uuid, lease_until: timestamp, expected_revision: revision,
  outcome: z.enum(["pending", "failed", "expired", "complete", "cancelled"]),
}).strict();
export const turnSchema = z.object({
  id: uuid, kind: z.enum(["opening", "answer"]), learner: answer.nullable(),
  assistant: assistantTextSchema.nullable(),
  status: z.enum(["pending", "failed", "complete", "cancelled"]),
  attempts: z.array(attemptSchema).min(1).max(3),
}).strict().superRefine((turn, ctx) => {
  if ((turn.kind === "opening") !== (turn.learner === null) ||
      (turn.status === "complete") !== (turn.assistant !== null) ||
      turn.attempts.at(-1)?.outcome !== turn.status ||
      turn.attempts.slice(0, -1).some(a => !["failed", "expired"].includes(a.outcome))) {
    ctx.addIssue({ code: "custom", message: "Invalid turn state" });
  }
});
const metadata = {
  id: uuid, topic: topicSchema, level: levelSchema,
  state: z.enum(["ready", "active", "completed"]),
  revision, created_at: timestamp, updated_at: timestamp, completed_at: timestamp.nullable(),
};
export const interviewMetadataSchema = z.object(metadata).strict();
export const interviewSchema = z.object({
  ...metadata, owner_id: uuid, schema_version: z.literal(1), turns: z.array(turnSchema).max(9),
}).strict().superRefine((row, ctx) => {
  const ids = row.turns.flatMap(t => [t.id, ...t.attempts.flatMap(a => [a.request_id, a.token])]);
  if (new Set(ids).size !== ids.length ||
      (row.state === "ready" && row.turns.length !== 0) ||
      (row.state === "active" && row.turns.length === 0) ||
      (row.state === "completed") !== (row.completed_at !== null) ||
      row.turns.some((t, i) => (t.kind === "opening") !== (i === 0) || (i < row.turns.length - 1 && t.status !== "complete")) ||
      (row.state === "completed" && row.turns.some(t => t.status === "pending")) ||
      new TextEncoder().encode(JSON.stringify(row.turns)).length > 131072) {
    ctx.addIssue({ code: "custom", message: "Invalid interview state" });
  }
});
export type Interview = z.infer<typeof interviewSchema>;
export type InterviewMetadata = z.infer<typeof interviewMetadataSchema>;
export const createInterviewSchema = z.object({ id: uuid, topic: topicSchema, level: levelSchema }).strict();
export const turnRequestSchema = z.discriminatedUnion("mode", [
  z.object({ id: uuid, revision, requestId: uuid, turnId: uuid, mode: z.literal("start") }).strict(),
  z.object({ id: uuid, revision, requestId: uuid, turnId: uuid, mode: z.literal("answer"), text: answer }).strict(),
  z.object({ id: uuid, revision, requestId: uuid, turnId: uuid, mode: z.literal("retry") }).strict(),
]);
export const finishInterviewSchema = z.object({ id: uuid, revision }).strict();
export const interviewIdSchema = z.object({ id: uuid }).strict();
export const historyCursorSchema = z.object({ created_at: timestamp, id: uuid }).strict().nullable();
export type HistoryCursor = z.infer<typeof historyCursorSchema>;
export type TurnRequest = z.infer<typeof turnRequestSchema>;
export const interviewNotices = {
  ok: "Saved privately.",
  replay: "Loaded the saved request state. No additional AI request was started.",
  invalid: "Invalid interview request. No AI request was started.",
  auth: "Please log in again.",
  denied: "New AI requests require a recorded adult age (18+) and administrator-approved AI access. Your saved history, finish and deletion remain available.",
  unavailable: "Interview history is unavailable. Check service readiness and try again.",
  missing: "Interview not found or no longer available.",
  conflict: "The interview changed. Reload before continuing. No new AI request was started.",
  busy: "An interview request is still pending. Reload, or explicitly retry after its 75-second lease.",
  quota: "The shared 15/day text-AI limit (coach and interviews) has been reached. No new answer was saved or AI request started.",
  limit: "An interview limit was reached. No new answer was saved or AI request started.",
  reserve_failed: "Your answer was not saved; no AI request was started.",
  reserve_unknown: "We could not confirm whether your answer was saved. No AI request was started by this action. Reload before retrying.",
  create_unknown: "We could not confirm whether the empty interview was created. Reload history before explicitly creating a new interview; creation will not be automatically replayed.",
  saved_failed: "Your answer or opening request is saved. No interviewer reply was saved. You may explicitly retry.",
  save_unknown: "We could not confirm whether the reply was saved. Reload before retrying.",
  finish_unknown: "We could not confirm whether the interview was finished. Reload its saved state before trying again.",
  delete_unknown: "We could not confirm whether the interview was deleted. Reload history or its saved state before trying again.",
  stale: "This attempt can no longer save a reply. Reload the saved interview.",
  deleted: "Interview deleted. A request already sent to the AI service cannot be retracted.",
  connection: "Connection lost. Server processing may continue. Reload to check saved state before retrying.",
} as const;
export type InterviewCode = keyof typeof interviewNotices;
export type InterviewResult = { code: InterviewCode; interview?: Interview };
export const interviewDisclosure = "Submitted answers and saved interviewer replies persist in your private history until you delete the interview or your account, and are included in your data export. They are not automatically shared with instructors, administrators, reviewers or peers. Relevant conversation text is sent to the existing external AI service. Avoid personal or confidential information. AI feedback can be wrong; it is not a course grade, certificate or hiring decision. Generic lesson-coach chat remains unsaved.";
export const interviewLimits = "Limits: 8 answers per interview; 1,200 characters per answer; 1,600 per reply; 3 explicit attempts per turn; one pending request per owner; 75-second lease; 100 retained interviews; history pages of 20. Coach and interviews share 15 text-AI requests/day. Failed inference consumes a request.";
