import { z } from "zod";
import { FAMILIES } from "./curriculum";
import { isPresentation, presentationLessonSchema, slideLessonSchema, slideStyleSchema, type LessonContent } from "./learning";
import { MAX_PRESENTATION_SLIDES, MAX_TEXTBOX_CHARACTERS, presentationAuthorSchema, textRunSchema, type PresentationAuthor } from "./presentation";

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
    body: textRunSchema.shape.text.min(1).refine(text => Boolean(text.trim()), "A slide needs text."),
    style: slideStyleSchema,
  })).min(1).max(MAX_PRESENTATION_SLIDES),
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

// Match the presentation editor, not the retired 3–6 / 2,400 author limits.
// Parser limits remain independent. Never clip text, discard or pad source slides.
export function slidesFromMaterial(material: { text: string; slides?: string[] }, mode: "text" | "powerpoint"): AuthorLesson["slides"] {
  let units: string[];
  if (mode === "powerpoint") {
    if (!material.slides) throw new Error("Slide import requires a PPTX presentation. Choose Copy text only for PDF or DOCX.");
    units = material.slides;
    if (units.length < 1 || units.length > MAX_PRESENTATION_SLIDES) throw new Error("Slide import supports 1–30 source slides. Split the PPTX; nothing was saved.");
    if (units.some(text => !text.trim() || text.length > MAX_TEXTBOX_CHARACTERS)) throw new Error("Each imported slide needs text and at most 10,000 characters. Image-only or longer slides cannot be imported. Split or edit the PPTX; nothing was saved.");
  } else {
    const text = material.text;
    if (!text.trim()) throw new Error("Text import needs text. Image-only files cannot be imported; nothing was saved.");
    if (text.length > 60_000) throw new Error("Text import supports the parser's 60,000-character file ceiling. Split the source file; nothing was saved.");
    units = [];
    // Keep short imports readable; grow chunks only enough to retain the full
    // parser output within 30 slides (60,000 characters => 30 × 2,000).
    const chunkSize = Math.max(400, Math.ceil(text.length / MAX_PRESENTATION_SLIDES));
    for (let offset = 0; offset < text.length; offset += chunkSize) units.push(text.slice(offset, offset + chunkSize));
  }
  const result = units.map((body, index) => ({ title: `Slide ${index + 1}`, body, style: { ...defaultSlideStyle } }));
  return result;
}

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) : text;
}

export function toStoredLesson(draft: AuthorLesson): LessonContent {
  const summary = clip(draft.slides.map(slide => slide.body).join(" "), 300);
  return slideLessonSchema.parse({
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
      steps: draft.slides.length >= 3
        ? draft.slides.slice(0, 3).map((slide, index) => clip(slide.title, 120) || `Read slide ${index + 1}`)
        : ["Read the lesson slides.", "Review the key points.", "Reflect on what you learned."],
    },
    questions: draft.quiz.map(question => ({ ...question, explanation: "Review the matching slide." })),
  });
}

export function fromStoredLesson(content: LessonContent): AuthorLesson {
  if(isPresentation(content))throw new Error("Open this lesson in the presentation editor.");
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

export function toPresentationLesson(draft:PresentationAuthor) {
  const parsed=presentationAuthorSchema.parse(draft);
  return presentationLessonSchema.parse({
    ...parsed.document,template:"slides",format:"presentation",title:parsed.title,
    subject:FAMILIES["soft-product"],summary:"A presentation created by the lesson author.",
    metadata:{version:1,audience:parsed.audience,difficulty:parsed.difficulty,topic:"soft-product",outcomes:["Review the author's presentation."],prerequisites:[]},
    activity:{prompt:"Review the slides in order.",steps:["Read the presentation.","Review the readable outline.","Reflect on what you learned."]},
    questions:parsed.quiz.map(q=>({...q,explanation:"Review the matching slide."})),
  });
}
export function fromPresentationLesson(content:LessonContent):PresentationAuthor {
  if(!isPresentation(content))throw new Error("Legacy content requires the legacy adapter.");
  const metadata=content.metadata as Record<string,unknown>|undefined;
  return presentationAuthorSchema.parse({title:content.title,audience:metadata?.audience??"learners",difficulty:metadata?.difficulty??"foundation",
    document:{schemaVersion:1,width:960,height:540,slides:content.slides},quiz:content.questions.map(({prompt,options,correct})=>({prompt,options,correct}))});
}
