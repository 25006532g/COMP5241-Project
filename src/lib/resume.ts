import { z } from "zod";

export const resumeSchema = z.object({
  stage: z.enum(["slides", "activity", "quiz"]),
  slide: z.number().int().min(0).max(5),
  ordering: z.array(z.number().int().min(0).max(5)).min(3).max(6),
  answers: z.array(z.number().int().min(-1).max(3)).max(10).refine(a => a.length === 0 || a.length >= 3),
});
// Author slide lessons (legacy or presentation) have the same 30-slide budget.
// Standard lessons retain <=5; callers must also check actual stored counts.
export const presentationResumeSchema = resumeSchema.extend({slide:z.number().int().min(0).max(29)});
export function resumeSchemaForLesson(content: { template?: string; format?: string }) {
  return content.template === "slides" ? presentationResumeSchema : resumeSchema;
}

export type ResumeState = z.infer<typeof resumeSchema>;