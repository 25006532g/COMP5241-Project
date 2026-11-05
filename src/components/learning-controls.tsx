"use client";

import Link from "next/link";
import { lazy,Suspense,useActionState, useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Bookmark, Check, ChevronLeft, ChevronRight, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { attend, reviewLesson, saveBookmark, saveResume, submitQuiz, updateLesson, type ActionState } from "@/app/learning/actions";
import type { LessonContent, PresentationLesson, VersionEvidence } from "@/lib/learning";
const PresentationView=lazy(()=>import("./presentation-view").then(m=>({default:m.PresentationView})));
import type { ResumeState } from "@/lib/resume";
import { LessonPreview, LessonText } from "./lesson-preview";
import { MetadataFields } from "./lesson-metadata";

export function ActionForm({ action, children, label, preview, disabled = false, retainInput = false, creation = false }: { action: (previous: ActionState, form: FormData) => Promise<ActionState>; children: React.ReactNode; label: string; preview?: LessonContent; disabled?: boolean; retainInput?: boolean; creation?: boolean }) {
  const inFlight = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);
  const keepInput = retainInput || Boolean(preview);
  useEffect(() => {
    const form = formElement.current;
    if (!form || !keepInput) return;
    // React resets forms during commit, when its delegated event handlers are disabled.
    const preserve = (event: Event) => event.preventDefault();
    form.addEventListener("reset", preserve);
    return () => form.removeEventListener("reset", preserve);
  }, [keepInput]);
  const notice = useRef<HTMLParagraphElement>(null);
  const [state, submit, pending] = useActionState(async (previous: ActionState, form: FormData) => {
    try { return await action(previous, form); }
    catch (error) {
      if (!creation) throw error;
      return { saveUncertain: true as const, error: "Save outcome is unknown. This lesson may already exist. Your input is retained here. Check your owned lessons before creating another copy." };
    }
    finally { inFlight.current = false; }
  }, {});
  const blocked = disabled || Boolean(state.saveUncertain);
  useEffect(() => { if (state.error) notice.current?.focus(); }, [state]);
  return <form ref={formElement} action={submit} onInvalidCapture={event => {
    // Native validation must be able to reveal/focus fields inside collapsed quiz sections.
    if (event.target instanceof HTMLElement) event.target.closest("details")?.setAttribute("open", "");
  }} onSubmit={event => { if (inFlight.current || blocked) event.preventDefault(); else inFlight.current = true; }} className="learning-form"><fieldset disabled={pending || blocked}>{children}{preview && <LessonPreview content={preview} />}<button className="auth-submit" type="submit">{pending ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}{pending ? "Working..." : label}</button></fieldset>{state.error && <p ref={notice} tabIndex={-1} role="alert" className="form-notice notice-error">{state.error}</p>}{state.success && <p role="status" className="form-notice">{state.success}</p>}{state.lessonId && <Link className="text-link" href={`/courses/${state.lessonId}`}>Open lesson <ChevronRight size={15} /></Link>}{creation && state.saveUncertain && <section className="learning-section" aria-label="Reconcile uncertain save"><h2>Check the saved result before continuing</h2><p>Keep this tab open to retain your input. Open your private lessons in another tab and refresh the list. If this lesson exists, open it and use Edit lesson to continue with its saved ID and version. Do not generate another copy until the outcome has been reconciled.</p><Link className="text-link" href="/catalog?visibility=private" target="_blank" rel="noopener noreferrer">Check my private lessons (new tab)</Link></section>}</form>;
}

export function BookmarkButton({ id, initial }: { id: string; initial: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <div><button className="secondary-button" disabled={pending} aria-pressed={saved} onClick={() => startTransition(async () => { const result = await saveBookmark(id, !saved); setError(result.error ?? ""); if (!result.error) setSaved(!saved); })}><Bookmark size={17} fill={saved ? "currentColor" : "none"} />{pending ? "Saving..." : saved ? "Saved" : "Save lesson"}</button>{error && <p role="alert">{error}</p>}</div>;
}

type SafeContent<T> = T extends LessonContent ? Omit<T,"questions"> & { questions:{prompt:string;options:string[]}[] } : never;
type PlayerContent = SafeContent<LessonContent>;
type ProgressEvidence = VersionEvidence & { passed: boolean };
type PlayerProps = { id: string; ownerId?: string; version: number; content: PlayerContent; saved: ResumeState | null; revision: number; resumeAvailable: boolean; evidence?: ProgressEvidence };

export function EvidenceSummary({ evidence, quizLength }: { evidence: ProgressEvidence; quizLength?: number }) {
  return <section className="progress-evidence" aria-label={`Version ${evidence.version} evidence`}>
    <h2>Version {evidence.version} evidence</h2>
    <ul><li><strong>REVIEWED</strong> — {evidence.reviewedAt ? "Acknowledgement saved" : "No acknowledgement recorded"}</li>
      <li><strong>ATTENDED</strong> — {quizLength === 0 ? "No quiz in this lesson" : evidence.attendedAt ? "Final quiz reached" : "No version-specific attendance recorded"}</li>
      <li><strong>PASSED</strong> — {quizLength === 0 ? "Not applicable — no quiz or certificate" : evidence.passed ? "Saved passing quiz result (at least 60%)" : "No saved passing quiz result"}</li></ul>
    <p>Review is optional self-acknowledgement, not a quiz gate or an award. Historical review is unknown unless explicitly recorded.</p>
  </section>;
}

export function LessonPlayer(props: PlayerProps) {
  // Reset both UI and in-flight response ownership when the server supplies a
  // different account, lesson or version. Resume remains independently saved.
  return <PlayerSession key={`${props.ownerId ?? ""}:${props.id}:${props.version}`} {...props} />;
}

function PlayerSession({ id, version, content, saved, revision, resumeAvailable, evidence: loadedEvidence }: PlayerProps) {
  const initial = saved && saved.answers.length === content.questions.length && saved.slide < content.slides.length && saved.ordering.length === content.activity.steps.length && new Set(saved.ordering).size === saved.ordering.length && saved.ordering.every(index => index < saved.ordering.length) && (content.template !== "slides" || saved.stage !== "activity" && (content.questions.length > 0 || saved.stage !== "quiz")) ? saved : null;
  const [slide, setSlide] = useState(initial?.slide ?? 0);
  const legacySlide = "format" in content ? null : content.slides[slide];
  const [stage, setStage] = useState<"slides" | "activity" | "quiz">(initial?.stage ?? "slides");
  const [order, setOrder] = useState(initial?.ordering ?? content.activity.steps.map((_, index) => index).reverse());
  const [checked, setChecked] = useState(false);
  const quizLength = content.questions.length;
  const passMark = quizLength === 10 ? 6 : Math.ceil(quizLength * 0.6);
  const [answers, setAnswers] = useState<number[]>(initial?.answers ?? Array(quizLength).fill(-1));
  const [result, setResult] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const [resumeError, setResumeError] = useState("");
  const [resumeConflict, setResumeConflict] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [evidence, setEvidence] = useState<ProgressEvidence>(loadedEvidence ?? { version, reviewedAt: null, attendedAt: null, passed: false });
  const [reviewNotice, setReviewNotice] = useState<ActionState>({});
  const [reviewPending, startReview] = useTransition();
  const reviewInFlight = useRef(false);
  const restoredQuizAttendance = useRef(initial?.stage === "quiz" && !loadedEvidence?.attendedAt);
  const live = useRef(true);
  const reviewStatus = useRef<HTMLParagraphElement>(null);
  const actionError = useRef<HTMLParagraphElement>(null);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => { if (reviewNotice.error || reviewNotice.success) reviewStatus.current?.focus(); }, [reviewNotice]);
  useEffect(() => { if (result.error) actionError.current?.focus(); }, [result]);
  const mergeEvidence = useCallback((next: VersionEvidence | undefined) => {
    if (next?.version === version) setEvidence(previous => ({
      ...previous, reviewedAt: previous.reviewedAt ?? next.reviewedAt, attendedAt: previous.attendedAt ?? next.attendedAt,
    }));
  }, [version]);
  const acknowledgeReview = () => {
    if (reviewInFlight.current || evidence.reviewedAt) return;
    reviewInFlight.current = true;
    startReview(async () => {
      let outcome: ActionState;
      try { outcome = await reviewLesson(id, version); }
      catch { outcome = { error: "Review acknowledgement is unconfirmed; it may have saved. Retry safely or reload to check." }; }
      finally { reviewInFlight.current = false; }
      if (!live.current) return;
      if (!outcome.error && outcome.progress?.version === version && outcome.progress.reviewedAt) {
        mergeEvidence(outcome.progress); setReviewNotice({ success: "Review acknowledgement saved for this version." });
      } else setReviewNotice({ error: outcome.error ?? "Review acknowledgement is unconfirmed. Retry safely or reload to check this version." });
    });
  };
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const firstStage = useRef(true);
  const revisionRef = useRef(revision);
  const lastSaved = useRef(JSON.stringify(initial ?? { stage: "slides", slide: 0, ordering: content.activity.steps.map((_, index) => index).reverse(), answers: Array(quizLength).fill(-1) }));
  const waiting = useRef<ResumeState | null>(null);
  const saving = useRef(false);
  const blocked = useRef(false);
  const flush = useCallback(async () => {
    if (saving.current || blocked.current) return;
    saving.current = true;
    setSavingProgress(true);
    try {
      while (waiting.current && !blocked.current) {
        const next = waiting.current;
        waiting.current = null;
        let outcome: Awaited<ReturnType<typeof saveResume>>;
        try { outcome = await saveResume(id, version, revisionRef.current, next); }
        catch { outcome = { error: "Could not save progress. Try again when your connection is restored." }; }
        if (outcome.error) {
          setResumeError(outcome.error);
          if (outcome.conflict) { blocked.current = true; setResumeConflict(true); }
          else waiting.current ??= next;
          break;
        }
        revisionRef.current = outcome.revision ?? revisionRef.current;
        lastSaved.current = JSON.stringify(next);
        setResumeError("");
      }
    } finally { saving.current = false; setSavingProgress(false); }
  }, [id, version]);
  useEffect(() => {
    const state: ResumeState = { stage, slide, ordering: order, answers };
    if (!resumeAvailable || blocked.current) return;
    if (!saving.current && JSON.stringify(state) === lastSaved.current) {
      waiting.current = null;
      setResumeError("");
      return;
    }
    waiting.current = state;
    void flush();
  }, [stage, slide, order, answers, resumeAvailable, flush]);
  useEffect(() => {
    if (firstStage.current) { firstStage.current = false; return; }
    stageHeading.current?.focus();
  }, [stage, slide]);
  useEffect(() => { if (result.score !== undefined) resultHeading.current?.focus(); }, [result.score]);
  const moveStep = (index: number, direction: number) => {
    const reordered = [...order];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    setOrder(reordered); setChecked(false);
  };
  const startQuiz = useCallback(() => startTransition(async () => {
    let response: ActionState;
    try { response = await attend(id, version); }
    catch { response = { error: "Attendance acknowledgement is unconfirmed; it may have saved. Try reaching the quiz again." }; }
    if (!live.current) return;
    if (response.error) setResult(response);
    else if (response.progress && response.progress.version !== version) setResult({ error: "Attendance response belongs to another version. Reload this lesson." });
    else { mergeEvidence(response.progress); setResult({}); setStage("quiz"); }
  }), [id, version, mergeEvidence]);
  useEffect(() => {
    // Restoring the quiz means reaching it now, not backfilling an old visit.
    // Keep all restored answers/place; review acknowledgement is never required.
    if (restoredQuizAttendance.current) { restoredQuizAttendance.current = false; startQuiz(); }
  }, [startQuiz]);
  return <div className="learning-player"><EvidenceSummary evidence={evidence} quizLength={quizLength} />{!resumeAvailable && <p role="alert" className="form-notice notice-error">Progress saving is unavailable. You can continue this lesson, but your place will not be saved. Please contact the site administrator.</p>}{resumeError && <p role="alert" className="form-notice notice-error">{resumeError} {resumeConflict ? <button type="button" onClick={() => location.reload()}>Reload lesson</button> : <button type="button" disabled={savingProgress} onClick={() => void flush()}>Retry saving progress</button>}</p>}
    <nav className="learning-tabs" aria-label="Lesson sections"><button aria-current={stage === "slides" ? "step" : undefined} onClick={() => setStage("slides")}>Slides</button>{content.template !== "slides" && <button aria-current={stage === "activity" ? "step" : undefined} onClick={() => setStage("activity")}>Practice</button>}{quizLength > 0 && <button disabled={pending} aria-current={stage === "quiz" ? "step" : undefined} onClick={startQuiz}>Final quiz</button>}</nav>
    {result.error && <p ref={actionError} tabIndex={-1} role="alert" className="form-notice notice-error">{result.error}</p>}
    {stage === "slides" && <section className={"format" in content ? "presentation-player" : "slide-stage"} style={{ background: legacySlide?.style?.background, color: legacySlide?.style?.color, textAlign: legacySlide?.style?.align }}>
      <div className="slide-number" aria-hidden="true">{String(slide + 1).padStart(2, "0")}</div>
      <div><span className="eyebrow">{slide + 1} / {content.slides.length}</span>
        <h2 ref={stageHeading} tabIndex={-1} style={{ color: legacySlide?.style?.color, fontSize: legacySlide?.style?.size, textAlign: legacySlide?.style?.align }}>{content.slides[slide].title}</h2>
        {"format" in content ? <Suspense fallback={<p>Loading presentation…</p>}><PresentationView slide={content.slides[slide]} lessonId={id}/></Suspense> : <p style={{ color: legacySlide?.style?.color, fontSize: legacySlide?.style ? Math.max(16, legacySlide.style.size - 6) : undefined, textAlign: legacySlide?.style?.align }}><LessonText text={legacySlide?.body??""} /></p>}
        {content.template !== "slides" && <blockquote><LessonText text={legacySlide?.example??""} /></blockquote>}
        {slide === content.slides.length - 1 && <section className="review-acknowledgement" aria-label="Optional slide review acknowledgement">
          <h3>Finished reviewing this version&apos;s slides?</h3>
          <p>Only acknowledge if you have reviewed the slides. {quizLength ? "You can continue to the final quiz without acknowledging." : "This lesson has no quiz or quiz certificate."}</p>
          <button type="button" className="secondary-button" disabled={reviewPending || Boolean(evidence.reviewedAt)} onClick={acknowledgeReview}>{reviewPending ? "Saving acknowledgement..." : evidence.reviewedAt ? "Review acknowledged" : "Acknowledge slide review"}</button>
          {(reviewNotice.error || reviewNotice.success) && <p ref={reviewStatus} tabIndex={-1} role={reviewNotice.error ? "alert" : "status"} className={`form-notice${reviewNotice.error ? " notice-error" : ""}`}>{reviewNotice.error ?? reviewNotice.success}</p>}
        </section>}
      </div>
      <div className="player-navigation">
        <button className="secondary-button" disabled={slide === 0} onClick={() => setSlide(slide - 1)}><ChevronLeft size={18} />Previous</button>
        {(slide + 1 < content.slides.length || content.template !== "slides" || quizLength > 0) && <button className="auth-submit" disabled={pending} onClick={() => {
          if (slide + 1 < content.slides.length) setSlide(slide + 1);
          else if (content.template === "slides") startQuiz();
          else setStage("activity");
        }}>{slide + 1 < content.slides.length ? "Next" : content.template === "slides" ? "Quiz" : "Practice"}<ChevronRight size={18} /></button>}
      </div>
    </section>}
    {stage === "activity" && <section className="activity-stage"><span className="eyebrow">PUT IT IN ORDER</span><h2 ref={stageHeading} tabIndex={-1}>{content.activity.prompt}</h2><ol className="ordering-list">{order.map((step, index) => <li key={step}><span>{content.activity.steps[step]}</span><button className="icon-button" title="Move up" aria-label={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => moveStep(index, -1)}><ArrowUp size={17} /></button><button className="icon-button" title="Move down" aria-label={`Move step ${index + 1} down`} disabled={index === order.length - 1} onClick={() => moveStep(index, 1)}><ArrowDown size={17} /></button></li>)}</ol><div className="player-navigation"><button className="secondary-button" onClick={() => setChecked(true)}><Check size={17} />Check order</button><button className="auth-submit" disabled={pending} onClick={startQuiz}>Start final quiz<ChevronRight size={17} /></button></div>{checked && <p role="status">{order.every((value, index) => value === index) ? "Correct order." : "Not quite. Try another order or revisit the slides."}</p>}</section>}
    {stage === "quiz" && quizLength > 0 && <section><div className="section-title"><h2 ref={stageHeading} tabIndex={-1}>Final quiz</h2><span>{quizLength} questions · Pass: {passMark} correct</span></div><form onSubmit={event => { event.preventDefault(); startTransition(async () => {
      let outcome: ActionState;
      try { outcome = await submitQuiz(id, version, answers); }
      catch { outcome = { error: "Quiz save is unconfirmed; it may have saved. Check quiz history before retrying." }; }
      if (!live.current) return;
      if (outcome.version !== undefined && outcome.version !== version) { setResult({ error: "Quiz response belongs to another version. Reload and check quiz history." }); return; }
      setResult(outcome);
      if (!outcome.error && outcome.attemptId && outcome.score !== undefined && outcome.score >= passMark) setEvidence(previous => ({ ...previous, passed: true }));
    }); }}><fieldset disabled={pending || result.score !== undefined} className="quiz-fields">{content.questions.map((question, index) => <fieldset key={index} className="quiz-question"><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`question-${index}`} required checked={answers[index] === optionIndex} onChange={() => setAnswers(answers.map((answer, answerIndex) => answerIndex === index ? optionIndex : answer))} />{option}</label>)}</fieldset>)}{result.score === undefined && <button className="auth-submit" type="submit" disabled={answers.includes(-1) || pending}>{pending ? "Saving result..." : "Submit quiz"}<Check size={17} /></button>}</fieldset></form>{result.score !== undefined && <div className="quiz-result" role="status"><h3 ref={resultHeading} tabIndex={-1}>{result.score} / {quizLength} ({Math.round((result.score ?? 0) / quizLength * 100)}%)</h3><p>{result.success}</p>{(result.score ?? 0) >= passMark && <a className="auth-submit" href={`/api/certificates/${result.attemptId}`}>Download certificate</a>}<button className="secondary-button" onClick={() => { setAnswers(Array(quizLength).fill(-1)); setResult({}); stageHeading.current?.focus(); }}>Retry quiz</button>{result.feedback?.map((feedback, index) => <details key={index}><summary>{index + 1}. {feedback.prompt}</summary><strong>{feedback.correct}</strong><p>{feedback.explanation}</p></details>)}</div>}</section>}
  </div>;
}

export function LessonEditor({ id, version, initial, action: saveLesson, admin }: { id: string; version: number; initial: Exclude<LessonContent,PresentationLesson>; action: (previous: ActionState, form: FormData) => Promise<ActionState>; admin: boolean }) {
  const [draft, setContent] = useState(initial);
  // Keep raw typing (including Enter/caret position) separate from the canonical lesson.
  const [stepsText, setStepsText] = useState(initial.activity.steps.join("\n"));
  const steps = stepsText.split(/\r?\n/).map(step => step.trim()).filter(Boolean);
  const content = { ...draft, activity: { ...draft.activity, steps } };
  const [savedContent, setSavedContent] = useState(JSON.stringify(content));
  const stepsId = useId();
  const stepsInput = useRef<HTMLTextAreaElement>(null);
  const longStep = steps.findIndex(step => step.length > 120);
  const stepsError = steps.length < 3
    ? `Add ${3 - steps.length} more nonempty ${steps.length === 2 ? "step" : "steps"}. Enter 3–6 steps in the correct order; you have ${steps.length}.`
    : steps.length > 6
      ? `You have ${steps.length} steps. Remove or combine steps to keep 3–6 nonempty steps.`
      : longStep >= 0
        ? `Step ${longStep + 1} has ${steps[longStep].length} characters. Shorten it to 120 characters or fewer.`
        : "";
  useEffect(() => { stepsInput.current?.setCustomValidity(stepsError); }, [stepsError]);
  const [persisted, setPersisted] = useState({ id, version });
  const [uncertain, setUncertain] = useState(false);
  const readyInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (readyInput.current) readyInput.current.dataset.editorReady = "true"; }, []);
  const dirty = JSON.stringify(content) !== savedContent;
  useEffect(() => {
    if (!dirty && !uncertain) return;
    const leaveMessage = uncertain
      ? "The save outcome is unknown. Leaving will discard this editor's retained draft. Check your owned lessons first. Leave anyway?"
      : "You have unsaved lesson changes. Leave without saving?";
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); }
    function leaveByLink(event: MouseEvent) {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!link || link.getAttribute("href")?.startsWith("#") || link.getAttribute("target") === "_blank") return;
      if (!window.confirm(leaveMessage)) event.preventDefault();
    }
    function leaveByHistory(event: Event) {
      const navigation = event as Event & { navigationType?: string };
      if (navigation.navigationType === "traverse" && navigation.cancelable && !window.confirm(leaveMessage)) navigation.preventDefault();
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", leaveByLink, true);
    navigation?.addEventListener("navigate", leaveByHistory);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", leaveByLink, true); navigation?.removeEventListener("navigate", leaveByHistory); };
  }, [dirty, uncertain]);
  async function action(previous: ActionState, form: FormData) {
    if (uncertain) return { saveUncertain: true as const, error: "Save outcome is unknown. Check your owned lessons before creating another copy." };
    try {
      const result = await (persisted.id ? updateLesson : saveLesson)(previous, form);
      if (result.saveUncertain) {
        setUncertain(true);
        return result;
      }
      if (result.success && result.lessonId && result.version) {
        setPersisted({ id: result.lessonId, version: result.version });
        setSavedContent(String(form.get("content")));
      }
      return result;
    } catch {
      setUncertain(true);
      return { saveUncertain: true as const, error: "Save outcome is unknown. This lesson may already exist. Your draft is retained here. Check your owned lessons before creating another copy." };
    }
  }
  return <><ActionForm action={action} label="Save lesson" preview={content} disabled={uncertain}>
    <input ref={readyInput} type="hidden" name="lessonId" value={persisted.id} />
    <input type="hidden" name="version" value={persisted.version} />
    <input type="hidden" name="content" value={JSON.stringify(content)} />
    <p>Saving requires curriculum metadata, 4–6 complete slides, 3–6 activity steps and all 10 quiz questions. Open each question to write its options and explanation. Manual creation does not require AI access.</p>
    <label>Title<input value={content.title} minLength={3} maxLength={120} required onChange={event => setContent({ ...content, title: event.target.value })} /></label>
    <MetadataFields subject={content.subject} metadata={content.metadata} onChange={(subject, metadata) => setContent({ ...content, subject, metadata })} />
    <label>Summary<textarea value={content.summary} minLength={10} maxLength={300} required onChange={event => setContent({ ...content, summary: event.target.value })} /></label>
    <h2>Slides</h2>
    {content.slides.map((item, index) => <fieldset key={index}>
      <legend>Slide {index + 1}</legend>
      {(["title", "body", "example"] as const).map(field => <label key={field}>{field}<textarea value={item[field]} maxLength={{ title: 100, body: 400, example: 240 }[field]} required onChange={event => setContent({ ...content, slides: content.slides.map((slide, slideIndex) => slideIndex === index ? { ...slide, [field]: event.target.value } : slide) })} /></label>)}
      <button type="button" className="secondary-button" disabled={content.slides.length <= 4} onClick={() => setContent({ ...content, slides: content.slides.filter((_, slideIndex) => slideIndex !== index) })}><Trash2 size={16} />Remove slide</button>
    </fieldset>)}
    <button className="secondary-button" type="button" disabled={content.slides.length >= 6} onClick={() => setContent({ ...content, slides: [...content.slides, { title: "", body: "", example: "" }] })}><Plus size={16} />Add slide</button>
    <h2>Ordering activity</h2>
    <label>Prompt<input value={content.activity.prompt} required maxLength={240} onChange={event => setContent({ ...content, activity: { ...content.activity, prompt: event.target.value } })} /></label>
    <label htmlFor={stepsId}>Steps in correct order, one per line</label>
    <textarea ref={stepsInput} id={stepsId} value={stepsText} required aria-invalid={Boolean(stepsError)} aria-describedby={`${stepsId}-help${stepsError ? ` ${stepsId}-error` : ""}`} onChange={event => setStepsText(event.target.value)} />
    <p id={`${stepsId}-help`}>Enter 3–6 nonempty steps, up to 120 characters each. Blank lines and surrounding whitespace are ignored in the preview and saved lesson; your typing stays here.</p>
    {stepsError && <p id={`${stepsId}-error`} className="form-notice notice-error">{stepsError}</p>}
    <h2>Final quiz</h2>
    {content.questions.map((question, index) => <details key={index}>
      <summary>Question {index + 1}</summary>
      <label>Question<input value={question.prompt} required maxLength={300} onChange={event => setContent({ ...content, questions: content.questions.map((item, questionIndex) => questionIndex === index ? { ...item, prompt: event.target.value } : item) })} /></label>
      {question.options.map((option, optionIndex) => <label key={optionIndex}>Option {optionIndex + 1}<input value={option} required maxLength={200} onChange={event => setContent({ ...content, questions: content.questions.map((item, questionIndex) => questionIndex === index ? { ...item, options: item.options.map((choice, choiceIndex) => choiceIndex === optionIndex ? event.target.value : choice) } : item) })} /></label>)}
      <label>Correct option<select value={question.correct} onChange={event => setContent({ ...content, questions: content.questions.map((item, questionIndex) => questionIndex === index ? { ...item, correct: Number(event.target.value) } : item) })}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {optionIndex + 1}</option>)}</select></label>
      <label>Explanation<textarea value={question.explanation} required maxLength={400} onChange={event => setContent({ ...content, questions: content.questions.map((item, questionIndex) => questionIndex === index ? { ...item, explanation: event.target.value } : item) })} /></label>
    </details>)}
    {admin && <label><input type="checkbox" name="publish" /> Review and publish this lesson</label>}
  </ActionForm>{uncertain && <section className="learning-section" aria-label="Reconcile uncertain save">
    <h2>Check the saved result before continuing</h2>
    <p>Keep this tab open to retain your draft. Open the canonical lesson list in another tab, refresh it and compare the saved lesson with this draft. If found, open that lesson and choose Edit lesson to continue with its saved ID and version. Do not create another copy until the outcome has been reconciled.</p>
    <p><Link href="/catalog?visibility=private" target="_blank" rel="noopener noreferrer" className="text-link">Check my private lessons (new tab)</Link></p>
    {admin && <p>If you selected publication, also <Link href="/teaching" target="_blank" rel="noopener noreferrer" className="text-link">check my teaching lessons (new tab)</Link>.</p>}
    {persisted.id && <p><Link href={`/studio?edit=${persisted.id}`} target="_blank" rel="noopener noreferrer" className="text-link">Open saved lesson editor (new tab)</Link></p>}
  </section>}</>;
}