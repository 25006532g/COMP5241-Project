import { z } from "zod";
import { lessonProgress, lessonSchema } from "@/lib/learning";

const id = z.string().min(1);
const version = z.number().int().positive();
const timestamp = z.iso.datetime({ offset: true });
const evidence = z.record(z.string().regex(/^[1-9]\d*$/), z.object({
  reviewed_at: timestamp.optional(),
  attended_at: timestamp.optional(),
}).strict());

// Validate complete read sets before rendering: absent migration columns and
// malformed records must not become success-shaped zero evidence.
export const reportRows = {
  grants: z.array(z.object({ lesson_id: id })),
  lessons: z.array(z.object({ id, title: z.string().min(1), version })),
  enrollments: z.array(z.object({
    user_id: id, lesson_id: id, enrollment_kind: z.literal("public"),
    attended_at: timestamp.nullable(), progress_evidence: evidence,
  })),
  attempts: z.array(z.object({
    id, user_id: id, lesson_id: id, original_lesson_id: id,
    lesson_title: z.string().min(1), lesson_version: version,
    certificate_kind: z.literal("public"), score: z.number().int().min(0).max(10),
    answers: z.array(z.number().int().min(0).max(3)).min(3).max(10),
    questions: z.array(lessonSchema.shape.questions.element).min(3).max(10), completed_at: timestamp,
  }).refine(attempt => attempt.lesson_id === attempt.original_lesson_id &&
    attempt.answers.length === attempt.questions.length && attempt.score <= attempt.questions.length)),
};

export function buildLessonReport(
  lesson: z.infer<typeof reportRows.lessons>[number],
  enrollments: z.infer<typeof reportRows.enrollments>,
  attempts: z.infer<typeof reportRows.attempts>,
) {
  const history = attempts.filter(attempt => attempt.lesson_id === lesson.id && attempt.certificate_kind === "public");
  const roster = enrollments.filter(row => row.lesson_id === lesson.id && row.enrollment_kind === "public").map(row => ({
    userId: row.user_id,
    evidence: lessonProgress(row, history.filter(attempt => attempt.user_id === row.user_id), lesson.id, lesson.version),
  }));
  return {
    roster, history,
    reviewed: roster.filter(row => row.evidence.reviewedAt).length,
    attended: roster.filter(row => row.evidence.attendedAt).length,
    passed: roster.filter(row => row.evidence.passed).length,
  };
}
