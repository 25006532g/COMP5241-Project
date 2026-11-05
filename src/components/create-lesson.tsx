"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { extractLessonUpload } from "@/app/teaching/actions";
import { createManualLesson, updateLesson, type ActionState } from "@/app/learning/actions";
import { authorLessonSchema, emptyAuthorLesson, type AuthorLesson } from "@/lib/slide-lesson";

export function UploadLessonPage() {
  const [mode, setMode] = useState<"text" | "powerpoint">("text");
  const [draft, setDraft] = useState<AuthorLesson | null>(null);
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const epoch = useRef(0);
  const locked = useRef(false);
  const [saveLocked, setSaveLocked] = useState(false);
  useEffect(() => () => { epoch.current++; }, []);
  function invalidate() {
    epoch.current++;
    setDraft(null);
    setError("");
  }

  async function readFile(form: FormData) {
    if (inFlight.current || locked.current) return;
    inFlight.current = true;
    const request = ++epoch.current;
    form.set("mode", mode);
    setBusy(true);
    setDraft(null);
    setError("");
    try {
      const result = await extractLessonUpload(form);
      if (request !== epoch.current) return;
      if (!result.slides) {
        setError(result.error ?? "Could not read that file.");
        return;
      }
      setDraft({ ...emptyAuthorLesson(), title: result.name ?? "", slides: result.slides });
      setGeneration(value => value + 1);
    } catch {
      if (request === epoch.current) setError("Upload failed. Try the file again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section className="learning-section" aria-labelledby="upload-heading">
    <h2 id="upload-heading">Upload a file</h2>
    <form className="learning-form" onSubmit={event => { event.preventDefault(); void readFile(new FormData(event.currentTarget)); }}>
      <fieldset disabled={busy || saveLocked}>
        <legend>How should this file become a lesson?</legend>
        <label className="checkbox-field"><input type="radio" name="mode" checked={mode === "text"} onChange={() => { setMode("text"); invalidate(); }} /> Copy the text only</label>
        <label className="checkbox-field"><input type="radio" name="mode" checked={mode === "powerpoint"} onChange={() => { setMode("powerpoint"); invalidate(); }} /> Import the PowerPoint as slides</label>
      </fieldset>
      <p>{mode === "text" ? "PDF, DOCX and PPTX text only: at most 2,400 characters, in up to six slides. Complete any blank slides before saving." : "PPTX only: 3–6 slides, at most 400 text characters per slide. Real slide order is retained, not original layout."} Binary PPT and DOC cannot be imported safely; export as PPTX or DOCX first. Images, original fonts, positioning and full formatting are not imported. Files must be at most 4 MiB. Originals are not stored or sent to AI. Over-limit content is rejected, never clipped.</p>
      <label>File<input type="file" name="material" required disabled={busy || saveLocked} onChange={invalidate} accept={mode === "powerpoint" ? ".ppt,.pptx" : ".ppt,.pptx,.pdf,.doc,.docx"} /></label>
      <button className="primary-button" type="submit" disabled={busy || saveLocked}>{busy ? "Reading file..." : "Preview slides"}</button>
    </form>
    {error && <p role="alert" className="form-notice notice-error">{error}</p>}
    {draft && <SlideLessonEditor key={generation} initial={draft} onSaveLock={value => { locked.current = value; setSaveLocked(value); }} />}
  </section>;
}

export function SlideLessonEditor({ lessonId = "", version = 1, initial, onSaveLock }: { lessonId?: string; version?: number; initial?: AuthorLesson; onSaveLock?: (locked: boolean) => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AuthorLesson>(initial ?? emptyAuthorLesson());
  const [index, setIndex] = useState(0);
  const [quizOn, setQuizOn] = useState((initial?.quiz.length ?? 0) > 0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ack, setAck] = useState({ id: lessonId, version });
  const [success, setSuccess] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const blocked = useRef(false);
  const live = useRef(true);
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => { if (error || success) notice.current?.focus(); }, [error, success]);
  const slide = draft.slides[index] ?? draft.slides[0];

  function updateSlide(patch: Partial<AuthorLesson["slides"][number]>) {
    setDraft({ ...draft, slides: draft.slides.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }
  function updateStyle(patch: Partial<AuthorLesson["slides"][number]["style"]>) {
    updateSlide({ style: { ...slide.style, ...patch } });
  }

  async function save(intent: "save" | "publish") {
    if (inFlight.current || blocked.current) return;
    const quiz = quizOn ? draft.quiz : [];
    const payload = { ...draft, quiz };
    const parsed = authorLessonSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the lesson before saving.");
      return;
    }
    setPending(true);
    inFlight.current = true;
    onSaveLock?.(true);
    setError("");
    setSuccess("");
    const form = new FormData();
    form.set("template", "slides");
    form.set("intent", intent);
    form.set("content", JSON.stringify(parsed.data));
    form.set("lessonId", ack.id);
    form.set("version", String(ack.version));
    try {
      const result: ActionState = ack.id ? await updateLesson({}, form) : await createManualLesson({}, form);
      if (!live.current) return;
      if (result.saveUncertain || !result.error && (!result.lessonId || !result.version)) {
        blocked.current = true; setUncertain(true);
        setError("Save outcome is unknown. Keep this input and check Your lessons in another tab before saving again.");
      } else if (result.error) setError(result.error);
      else {
        setAck({ id: result.lessonId!, version: result.version! });
        setSuccess(`${result.success ?? "Lesson saved."} Version ${result.version}.`);
        // Stay mounted with acknowledged ID/version for reliable repeated saves.
        // Refresh server history/review forms without a same-URL navigation reset.
        router.refresh();
      }
    } catch {
      if (!live.current) return;
      blocked.current = true; setUncertain(true);
      setError("Save outcome is unknown. Keep this input and check Your lessons in another tab before saving again.");
    } finally {
      inFlight.current = false;
      if (live.current) { setPending(false); onSaveLock?.(blocked.current); }
    }
  }

  return <div className="learning-form"><fieldset disabled={pending || uncertain}>
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
    </fieldset>
    {(error || success) && <p ref={notice} tabIndex={-1} role={error ? "alert" : "status"} className={`form-notice${error ? " notice-error" : ""}`}>{error || success}</p>}
    {uncertain && <a className="text-link" href="/studio" target="_blank" rel="noopener noreferrer">Check Your lessons (new tab)</a>}
    <p>
      <button type="button" className="secondary-button" disabled={pending || uncertain} onClick={() => void save("save")}>{pending ? "Saving..." : "Save"}</button>
      <button type="button" className="auth-submit" disabled={pending || uncertain} onClick={() => void save("publish")}>{pending ? "Saving..." : "Save and publish"}</button>
    </p>
    <p>Save keeps the lesson private. Save and publish sends it to an administrator for approval before anyone else can see it. A quiz needs at least 3 questions.</p>
  </div>;
}
