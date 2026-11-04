import { z } from "zod";
import { FAMILIES } from "./curriculum";
import { lessonSchema, slideStyleSchema, type LessonContent } from "./learning";

export const defaultSlideStyle = { color: "#17201d", size: 24 as const, align: "left" as const, background: "#fffefa" };

const questionSchema = z.object({
  prompt: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(200)).length(4),
  correct: z.number().int().min(0).max(3),
});

export const authorLessonSchema = z.object({
  title: z.string().trim().min(3).max(120),
  audience: z.enum(["learners", "instructors", "both"]),
  difficulty: z.enum(["new", "foundation", "intermediate", "advanced"]),
  slides: z.array(z.object({
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(400),
    style: slideStyleSchema,
  })).min(3).max(6),
  quiz: z.array(questionSchema).max(10),
}).superRefine((value, context) => {
  if (value.quiz.length > 0 && value.quiz.length < 3) {
    context.addIssue({ code: "custom", path: ["quiz"], message: "Add at least 3 quiz questions, or turn the quiz off." });
  }
});

export type AuthorLesson = z.infer<typeof authorLessonSchema>;

export function emptyAuthorLesson(): AuthorLesson {
  const slide = () => ({ title: "", body: "", style: { ...defaultSlideStyle } });
  return { title: "", audience: "learners", difficulty: "foundation", slides: [slide(), slide(), slide()], quiz: [] };
}

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) : text;
}

export function toStoredLesson(draft: AuthorLesson): LessonContent {
  const summary = clip(draft.slides.map(slide => slide.body).join(" "), 300);
  return lessonSchema.parse({
    title: draft.title,
    subject: FAMILIES["soft-product"],
    summary: summary.length >= 10 ? summary : "Slides written by the lesson author.",
    template: "slides",
    metadata: {
      version: 1,
      audience: draft.audience,
      difficulty: draft.difficulty,
      topic: "soft-product",
      outcomes: ["Slides written by the lesson author."],
      prerequisites: [],
    },
    slides: draft.slides.map(slide => ({
      title: slide.title,
      body: slide.body,
      example: clip(slide.body, 240) || "See the slide body.",
      style: slide.style,
    })),
    activity: {
      prompt: "Review the slides in order.",
      steps: draft.slides.slice(0, 3).map((slide, index) => clip(slide.title, 120) || `Read slide ${index + 1}`),
    },
    questions: draft.quiz.map(question => ({ ...question, explanation: "Review the matching slide." })),
  });
}

export function fromStoredLesson(content: LessonContent): AuthorLesson {
  const metadata = content.metadata && typeof content.metadata === "object" ? content.metadata as Record<string, unknown> : {};
  const audience = metadata.audience === "instructors" || metadata.audience === "both" ? metadata.audience : "learners";
  const difficulty = metadata.difficulty === "new" || metadata.difficulty === "intermediate" || metadata.difficulty === "advanced" ? metadata.difficulty : "foundation";
  return {
    title: content.title,
    audience,
    difficulty,
    slides: content.slides.map(slide => ({
      title: slide.title,
      body: slide.body,
      style: slide.style ?? { ...defaultSlideStyle },
    })),
    quiz: content.template === "slides" ? content.questions.map(({ prompt, options, correct }) => ({ prompt, options, correct })) : [],
  };
}
