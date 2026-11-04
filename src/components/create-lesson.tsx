"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonContent } from "@/lib/learning";
import { extractLessonUpload } from "@/app/teaching/actions";
import { LessonEditor } from "@/components/learning-controls";
import { createManualLesson, updateLesson } from "@/app/learning/actions";
import { authorLessonSchema, defaultSlideStyle, emptyAuthorLesson, type AuthorLesson } from "@/lib/slide-lesson";

export const UPLOAD_DRAFT_KEY = "forge-upload-lesson";

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() : text;
}

export function draftFromUpload(name: string, text: string): LessonContent {
  const parts = text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  const slides = Array.from({ length: 4 }, (_, index) => {
    const part = parts[index] ?? "";
    return {
      title: clip(part, 80) || `Slide ${index + 1}`,
      body: clip(part, 400) || "Add the main point for this slide.",
      example: "Add an example.",
    };
  });
  const summary = clip(text, 300);
  return {
    title: clip(name, 120) || "Uploaded lesson",
    subject: "",
    summary: summary.length >= 10 ? summary : "Review the uploaded text and write a short summary.",
    slides,
    activity: { prompt: "", steps: ["", "", ""] },
    questions: Array.from({ length: 10 }, () => ({ prompt: "", options: ["", "", "", ""], correct: 0, explanation: "" })),
  };
}

function slidesFromExtract(text: string, mode: "text" | "powerpoint"): AuthorLesson["slides"] {
  const style = { ...defaultSlideStyle };
  const blocks = mode === "powerpoint"
    ? text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
    : text.replace(/\s+/g, " ").trim().match(/.{1,320}(\s|$)/g)?.map(part => part.trim()).filter(Boolean) ?? [];
  const slides = blocks.slice(0, 6).map((block, index) => {
    const lines = block.split("\n").map(line => line.trim()).filter(Boolean);
    const title = clip(lines[0] ?? `Slide ${index + 1}`, 100) || `Slide ${index + 1}`;
    const body = clip((mode === "powerpoint" ? lines.slice(1).join(" ") : "") || lines[0] || block, 400) || "Add the main point for this slide.";
    return { title, body, style };
  });
  while (slides.length < 3) slides.push({ title: `Slide ${slides.length + 1}`, body: "Add the main point for this slide.", style: { ...style } });
  return slides;
}

export function UploadLessonPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "powerpoint">("text");
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<AuthorLesson["slides"] | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function readFile(form: FormData) {
    const file = form.get("material");
    if (mode === "powerpoint" && file instanceof File && !/\.pptx?$/i.test(file.name)) {
      setError("Import PowerPoint accepts a PPT or PPTX file. Choose Copy text only for PDF or Word.");
      setSlides(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await extractLessonUpload(form);
      if (!result.text) {
        setError(result.error ?? "Could not read that file.");
        setSlides(null);
        return;
      }
      if (!title) setTitle(clip(result.name ?? "", 120));
      setSlides(slidesFromExtract(result.text, mode));
      setIndex(0);
    } catch {
      setError("Upload failed. Try the file again.");
    } finally {
      setBusy(false);
    }
  }

  async function save(intent: "save" | "publish") {
    if (!slides) {
      setError("Upload a file and preview the slides before saving.");
      return;
    }
    const parsed = authorLessonSchema.safeParse({ title, audience: "learners", difficulty: "foundation", slides, quiz: [] });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Add a lesson title of at least 3 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("template", "slides");
    form.set("intent", intent);
    form.set("content", JSON.stringify(parsed.data));
    try {
      const result = await createManualLesson({}, form);
      if (result.error) setError(result.error);
      else if (result.lessonId) router.push(`/studio?edit=${result.lessonId}`);
      else setError("Save was not confirmed. Check your lessons before trying again.");
    } catch {
      setError("Save was not confirmed. Check your lessons before trying again.");
    } finally {
      setBusy(false);
    }
  }

  const slide = slides?.[index];
  return <section className="learning-section" aria-labelledby="upload-heading">
    <h2 id="upload-heading">Upload a file</h2>
    <form className="learning-form" onSubmit={event => { event.preventDefault(); void readFile(new FormData(event.currentTarget)); }}>
      <fieldset>
        <legend>How should this file become a lesson?</legend>
        <label className="checkbox-field"><input type="radio" name="mode" checked={mode === "text"} onChange={() => { setMode("text"); setSlides(null); }} /> Copy the text only</label>
        <label className="checkbox-field"><input type="radio" name="mode" checked={mode === "powerpoint"} onChange={() => { setMode("powerpoint"); setSlides(null); }} /> Import the PowerPoint as slides</label>
      </fieldset>
      <p>{mode === "text" ? "Text is copied into slides. PDF, Word, PPT, and PPTX are accepted. The original file is not stored." : "Each PowerPoint slide becomes a lesson slide. Use PPT or PPTX. Legacy PPT may need to be saved as PPTX first."}</p>
      <label>Lesson title<input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} /></label>
      <label>File<input type="file" name="material" required accept={mode === "powerpoint" ? ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" : ".ppt,.pptx,.pdf,.doc,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"} /></label>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Reading file..." : "Preview slides"}</button>
    </form>
    {slide && <section className="slide-stage" aria-label="Slide preview" style={{ background: slide.style.background, color: slide.style.color, textAlign: slide.style.align }}>
      <div className="slide-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
      <div>
        <span className="eyebrow">{index + 1} / {slides?.length}</span>
        <h2 style={{ fontSize: slide.style.size }}>{slide.title}</h2>
        <p>{slide.body}</p>
        <div className="player-navigation">
          <button type="button" className="secondary-button" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
          <button type="button" className="secondary-button" disabled={!slides || index === slides.length - 1} onClick={() => setIndex(index + 1)}>Next</button>
        </div>
      </div>
    </section>}
    {error && <p role="alert" className="form-notice notice-error">{error}</p>}
    <p>
      <button type="button" className="secondary-button" disabled={busy || !slides} onClick={() => void save("save")}>Save</button>
      <button type="button" className="auth-submit" disabled={busy || !slides} onClick={() => void save("publish")}>Save and publish</button>
    </p>
    <p>Save keeps the lesson private. Save and publish sends it to an administrator for approval before other learners can see it.</p>
  </section>;
}

export function SlideLessonEditor({ lessonId = "", version = 1, initial }: { lessonId?: string; version?: number; initial?: AuthorLesson }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AuthorLesson>(initial ?? emptyAuthorLesson());
  const [index, setIndex] = useState(0);
  const [quizOn, setQuizOn] = useState((initial?.quiz.length ?? 0) > 0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const slide = draft.slides[index] ?? draft.slides[0];

  function updateSlide(patch: Partial<AuthorLesson["slides"][number]>) {
    setDraft({ ...draft, slides: draft.slides.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }
  function updateStyle(patch: Partial<AuthorLesson["slides"][number]["style"]>) {
    updateSlide({ style: { ...slide.style, ...patch } });
  }

  async function save(intent: "save" | "publish") {
    const quiz = quizOn ? draft.quiz : [];
    const payload = { ...draft, quiz };
    const parsed = authorLessonSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the lesson before saving.");
      return;
    }
    setPending(true);
    setError("");
    const form = new FormData();
    form.set("template", "slides");
    form.set("intent", intent);
    form.set("content", JSON.stringify(parsed.data));
    form.set("lessonId", lessonId);
    form.set("version", String(version));
    try {
      const result = lessonId ? await updateLesson({}, form) : await createManualLesson({}, form);
      if (result.error) setError(result.error);
      else if (result.lessonId) router.push(`/studio?edit=${result.lessonId}`);
      else setError("Save was not confirmed. Check Your lessons before trying again.");
    } catch {
      setError("Save was not confirmed. Check Your lessons before trying again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="learning-form">
    <section className="slide-stage" aria-label="Slide preview" style={{ background: slide.style.background, color: slide.style.color, textAlign: slide.style.align }}>
      <div className="slide-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
      <div>
        <span className="eyebrow">{index + 1} / {draft.slides.length}</span>
        <h2 style={{ color: slide.style.color, fontSize: slide.style.size, textAlign: slide.style.align }}>{slide.title || "Slide title"}</h2>
        <p style={{ color: slide.style.color, fontSize: Math.max(16, slide.style.size - 6), textAlign: slide.style.align }}>{slide.body || "Slide body"}</p>
        <div className="player-navigation">
          <button type="button" className="secondary-button" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
          <button type="button" className="secondary-button" disabled={index === draft.slides.length - 1} onClick={() => setIndex(index + 1)}>Next</button>
        </div>
      </div>
    </section>
    <label>Lesson title<input value={draft.title} maxLength={120} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
    <label>Audience<select value={draft.audience} onChange={event => setDraft({ ...draft, audience: event.target.value as AuthorLesson["audience"] })}>
      <option value="learners">University learners</option>
      <option value="instructors">Instructors</option>
      <option value="both">Learners and instructors</option>
    </select></label>
    <label>Difficulty<select value={draft.difficulty} onChange={event => setDraft({ ...draft, difficulty: event.target.value as AuthorLesson["difficulty"] })}>
      <option value="new">New</option>
      <option value="foundation">Foundation</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </select></label>
    <h2>Slide {index + 1}</h2>
    <label>Title<textarea value={slide.title} maxLength={100} onChange={event => updateSlide({ title: event.target.value })} /></label>
    <label>Body<textarea value={slide.body} maxLength={400} onChange={event => updateSlide({ body: event.target.value })} /></label>
    <label>Text color<input type="color" value={slide.style.color} onChange={event => updateStyle({ color: event.target.value })} /></label>
    <label>Font size<select value={slide.style.size} onChange={event => updateStyle({ size: Number(event.target.value) as AuthorLesson["slides"][number]["style"]["size"] })}>
      <option value={18}>Small</option>
      <option value={24}>Medium</option>
      <option value={32}>Large</option>
      <option value={40}>Extra large</option>
    </select></label>
    <label>Text position<select value={slide.style.align} onChange={event => updateStyle({ align: event.target.value as AuthorLesson["slides"][number]["style"]["align"] })}>
      <option value="left">Left</option>
      <option value="center">Center</option>
      <option value="right">Right</option>
    </select></label>
    <label>Background color<input type="color" value={slide.style.background} onChange={event => updateStyle({ background: event.target.value })} /></label>
    <p>
      <button type="button" className="secondary-button" disabled={draft.slides.length <= 3} onClick={() => { setDraft({ ...draft, slides: draft.slides.filter((_, itemIndex) => itemIndex !== index) }); setIndex(Math.max(0, index - 1)); }}>Remove slide</button>
      <button type="button" className="secondary-button" disabled={draft.slides.length >= 6} onClick={() => { setDraft({ ...draft, slides: [...draft.slides, { title: "", body: "", style: { ...slide.style } }] }); setIndex(draft.slides.length); }}>Add slide</button>
    </p>
    <label className="checkbox-field"><input type="checkbox" checked={quizOn} onChange={event => {
      const on = event.target.checked;
      setQuizOn(on);
      if (on && draft.quiz.length < 3) setDraft({ ...draft, quiz: Array.from({ length: 3 }, (_, questionIndex) => draft.quiz[questionIndex] ?? { prompt: "", options: ["", "", "", ""], correct: 0 }) });
    }} /> Include a quiz</label>
    {quizOn && <>
      {draft.quiz.map((question, questionIndex) => <fieldset key={questionIndex}>
        <legend>Question {questionIndex + 1}</legend>
        <label>Question<input value={question.prompt} maxLength={300} onChange={event => setDraft({ ...draft, quiz: draft.quiz.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, prompt: event.target.value } : item) })} /></label>
        {question.options.map((option, optionIndex) => <label key={optionIndex}>Option {optionIndex + 1}<input value={option} maxLength={200} onChange={event => setDraft({ ...draft, quiz: draft.quiz.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, options: item.options.map((choice, choiceIndex) => choiceIndex === optionIndex ? event.target.value : choice) } : item) })} /></label>)}
        <label>Correct option<select value={question.correct} onChange={event => setDraft({ ...draft, quiz: draft.quiz.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, correct: Number(event.target.value) } : item) })}>
          {question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {optionIndex + 1}</option>)}
        </select></label>
      </fieldset>)}
      <button type="button" className="secondary-button" disabled={draft.quiz.length >= 10} onClick={() => setDraft({ ...draft, quiz: [...draft.quiz, { prompt: "", options: ["", "", "", ""], correct: 0 }] })}>Add question</button>
    </>}
    {error && <p role="alert" className="form-notice notice-error">{error}</p>}
    <p>
      <button type="button" className="secondary-button" disabled={pending} onClick={() => void save("save")}>{pending ? "Saving..." : "Save"}</button>
      <button type="button" className="auth-submit" disabled={pending} onClick={() => void save("publish")}>{pending ? "Saving..." : "Save and publish"}</button>
    </p>
    <p>Save keeps the lesson private. Save and publish sends it to an administrator for approval before anyone else can see it. A quiz needs at least 3 questions.</p>
  </div>;
}

export function ManualLesson({ fallback, admin }: { fallback: LessonContent; admin: boolean }) {
  const fallbackRef = useRef(fallback);
  const [initial, setInitial] = useState<LessonContent | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(UPLOAD_DRAFT_KEY);
      if (raw) {
        sessionStorage.removeItem(UPLOAD_DRAFT_KEY);
        setInitial(JSON.parse(raw) as LessonContent);
        return;
      }
    } catch { /* Use the blank lesson. */ }
    setInitial(fallbackRef.current);
  }, []);
  if (!initial) return <p>Opening the lesson editor...</p>;
  return <LessonEditor key={initial.title} id="" version={1} initial={initial} action={createManualLesson} admin={admin} />;
}
