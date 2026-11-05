import { z } from "zod";

export const resumeSchema = z.object({
  stage: z.enum(["slides", "activity", "quiz"]),
  slide: z.number().int().min(0).max(5),
  ordering: z.array(z.number().int().min(0).max(5)).min(3).max(6),
  answers: z.array(z.number().int().min(-1).max(3)).max(10).refine(a => a.length === 0 || a.length >= 3),
});

export type ResumeState = z.infer<typeof resumeSchema>;