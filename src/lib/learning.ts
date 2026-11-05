import { z } from "zod";

export const slideStyleSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  size: z.union([z.literal(18), z.literal(24), z.literal(32), z.literal(40)]),
  align: z.enum(["left", "center", "right"]),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
}).strict();

export const lessonSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subject: z.string().trim().min(2).max(60),
  summary: z.string().trim().min(10).max(300),
  metadata: z.unknown().optional(),
  template: z.literal("standard").optional(),
  slides: z.array(z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(400),
    example: z.string().min(1).max(240),
    style: slideStyleSchema.optional(),
  })).min(4).max(6),
  activity: z.object({
    prompt: z.string().min(1).max(240),
    steps: z.array(z.string().min(1).max(120)).min(3).max(6),
  }),
  questions: z.array(z.object({
    prompt: z.string().min(1).max(300),
    options: z.array(z.string().min(1).max(200)).length(4),
    correct: z.number().int().min(0).max(3),
    explanation: z.string().min(1).max(400),
  })).length(10),
});

// AI callers retain a plain Zod object (.shape/.extend/toJSONSchema). Stored
// author slides have a separate contract; never relax the AI response schema.
export const slideLessonSchema = lessonSchema.extend({
  template: z.literal("slides"),
  slides: z.array(lessonSchema.shape.slides.element).min(3).max(6),
  questions: z.array(lessonSchema.shape.questions.element).max(10).refine(
    questions => questions.length === 0 || questions.length >= 3, "Use no quiz or 3 to 10 questions."),
});
export const storedLessonSchema = z.union([slideLessonSchema, lessonSchema]);
export type LessonContent = z.infer<typeof storedLessonSchema>;

export function attemptOutcome(attempt: { score: number; questions?: unknown; answers?: unknown }) {
  const total = Array.isArray(attempt.questions) ? attempt.questions.length : 10;
  const valid = Number.isInteger(attempt.score) && total >= 3 && total <= 10 &&
    attempt.score >= 0 && attempt.score <= total &&
    (!Array.isArray(attempt.answers) || attempt.answers.length === total);
  return { total, passed: valid && attempt.score >= Math.ceil(total * 0.6) };
}

const evidenceSchema = z.object({
  reviewed_at: z.iso.datetime({ offset: true }).optional(),
  attended_at: z.iso.datetime({ offset: true }).optional(),
});
export type VersionEvidence = { version: number; reviewedAt: string | null; attendedAt: string | null };

// Enrollment/bookmark/resume activity is not review evidence. Legacy attendance
// has no known lesson version and must not be attributed to the current version.
export function versionEvidence(enrollment: { progress_evidence?: unknown } | undefined, version: number): VersionEvidence {
  const history = enrollment?.progress_evidence;
  const parsed = evidenceSchema.safeParse(history && typeof history === "object" && !Array.isArray(history)
    ? (history as Record<string, unknown>)[String(version)] : null);
  return { version, reviewedAt: parsed.success ? parsed.data.reviewed_at ?? null : null, attendedAt: parsed.success ? parsed.data.attended_at ?? null : null };
}

export function lessonProgress(
  enrollment: { progress_evidence?: unknown } | undefined,
  attempts: { original_lesson_id: string; lesson_version: number; score: number; questions?: unknown; answers?: unknown }[],
  id: string, version: number,
) {
  return { ...versionEvidence(enrollment, version), passed: attempts.some(attempt =>
    attempt.original_lesson_id === id && attempt.lesson_version === version && attemptOutcome(attempt).passed) };
}

export async function collectRows<Row>(readPage: (start: number, end: number) => PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await readPage(offset, offset + 499);
    if (error || !data) throw new Error("Could not load complete learning records. Check the database migrations and try again.");
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export function gradeQuiz(questions: LessonContent["questions"], answers: unknown) {
  const total = questions.length;
  if (total !== 10 && (total < 3 || total > 10)) throw new Error("A quiz must contain 3 to 10 questions, or the standard 10.");
  const validated = z.array(z.number().int().min(0).max(3)).length(total).parse(answers);
  const passMark = total === 10 ? 6 : Math.ceil(total * 0.6);
  const score = questions.reduce((totalScore, question, index) => totalScore + Number(question.correct === validated[index]), 0);
  return { score, total, passed: score >= passMark, answers: validated };
}

export function safeDestination(value: string | null, origin: string) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || /%(?:2f|5c|25)/i.test(value.split("?")[0])) return "/dashboard";
  try {
    const destination = new URL(value, origin);
    return destination.origin === new URL(origin).origin ? destination.pathname + destination.search : "/dashboard";
  } catch {
    return "/dashboard";
  }
}