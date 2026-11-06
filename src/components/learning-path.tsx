"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { generateLearningPath, type PathState } from "@/app/paths/actions";
import { GOALS, TOPICS, recommendLessons, validatePathResponse, type CatalogLesson, type Goal, type Preferences, type Recommendation, type Topic } from "@/lib/recommendations";
import { TOPIC_LABELS as topicLabels } from "@/lib/curriculum";

const goalLabels: Record<Goal, string> = {
  foundations: "Establish foundations", build: "Build software", quality: "Improve software quality", delivery: "Deliver and maintain software",
};

function LessonList({ lessons }: { lessons: Recommendation[] }) {
  return <ol className="ordering-list">{lessons.map(lesson => <li key={lesson.id}>
    <span style={{ minWidth: 0 }}>
      <small>{topicLabels[lesson.topic]}</small>
      <h3><Link href={`/courses/${lesson.id}`} className="text-link" style={{ overflowWrap: "anywhere" }}>{lesson.title}</Link></h3>
      <p>{lesson.reason}</p>
    </span>
    <ArrowRight size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
  </li>)}</ol>;
}

const changedNotice = "Your learning context changed. No previous AI path is shown. Explicitly generate a new path if you wish; local recommendations remain available.";
type ClientResult = PathState & { contextKey?: string; notice?: string };

export function LearningPath({ ownerId, catalog, completedIds, initialPreferences, aiAvailable }: {
  ownerId: string; catalog: CatalogLesson[]; completedIds: string[]; initialPreferences: Preferences; aiAvailable: boolean;
}) {
  const [topic, setTopic] = useState<Topic | "profile">("profile");
  const [goal, setGoal] = useState<Goal | "profile">("profile");
  const [shareCourseContent, setShareCourseContent] = useState(false);
  const [state, setState] = useState<ClientResult>({});
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const revision = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  // Bounded coarse context only, never the full catalog or provider identifiers.
  const contextKey = JSON.stringify([ownerId, initialPreferences, aiAvailable]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { revision.current += 1; }, [catalog, completedIds, contextKey]);
  useEffect(() => {
    if (!pending) { errorRef.current?.focus(); resultRef.current?.focus(); }
  }, [pending, state]);
  const preferences: Preferences = {
    ...initialPreferences,
    topics: topic === "profile" ? initialPreferences.topics : [topic],
    goal: goal === "profile" ? initialPreferences.goal : goal,
  };
  const recommendations = recommendLessons(catalog, preferences, completedIds);
  let currentPath: Recommendation[] | undefined;
  let changed = false;
  if (state.path) {
    try {
      if (!aiAvailable || state.contextKey !== contextKey || state.selectionKey !== `${topic}:${goal}`) throw new Error("Changed context");
      currentPath = validatePathResponse(
        JSON.stringify({ lessonIds: state.path.map((_, index) => `candidate-${index + 1}`) }),
        state.path, catalog, completedIds,
      );
    } catch { changed = true; }
  }
  // Discard the ENTIRE old result, rather than silently filtering or reviving it later.
  if (changed) setState({ notice: changedNotice });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A ref closes the same-tick gap before React commits disabled/pending controls.
    if (inFlight.current || !aiAvailable || !shareCourseContent || !recommendations.length) return;
    inFlight.current = true;
    const requestRevision = revision.current;
    const form = new FormData(event.currentTarget);
    setPending(true); setState({});
    try {
      const result = await generateLearningPath({}, form);
      if (!mounted.current) return;
      setState(requestRevision === revision.current ? { ...result, contextKey } : { notice: changedNotice });
    } catch {
      // The action returns fixed auth failures, not redirects. This catch is transport.
      if (mounted.current) setState({ error: "No AI path was received. The request may have used your shared allowance. No automatic retry was made. Retry only by explicitly submitting again. Local recommendations remain available." });
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return <form onSubmit={submit} className="learning-form">
    <section className="learning-section" aria-labelledby="local-path-heading">
      <h2 id="local-path-heading">Local recommendations</h2>
      <p>Rule-based, not AI. Lessons you have passed are excluded.</p>
      <div className="catalog-filters">
        <label>Curriculum topic<select name="topic" value={topic} disabled={pending} onChange={event => setTopic(event.target.value as Topic | "profile")}>
          <option value="profile">Profile preferences</option>{TOPICS.map(value => <option key={value} value={value}>{topicLabels[value]}</option>)}
        </select></label>
        <label>Learning goal<select name="goal" value={goal} disabled={pending} onChange={event => setGoal(event.target.value as Goal | "profile")}>
          <option value="profile">Profile goal</option>{GOALS.map(value => <option key={value} value={value}>{goalLabels[value]}</option>)}
        </select></label>
      </div>
      {recommendations.length ? <LessonList lessons={recommendations} /> : <p>No uncompleted curriculum lessons are available in your visible catalog. <Link href="/catalog" className="text-link">Course catalog</Link></p>}
    </section>
    <section className="learning-section" aria-labelledby="ai-path-heading" aria-busy={pending}>
      <h2 id="ai-path-heading">AI-generated path</h2>
      <p>Optional and not saved. Reloading clears the generated path. No automatic enrollment.</p>
      {!aiAvailable && <p id="ai-access-notice" role="status">External AI requires administrator-approved AI access. Local recommendations remain available.</p>}
      <label className="checkbox-field"><input name="shareCourseContent" type="checkbox" checked={shareCourseContent} onChange={event => setShareCourseContent(event.target.checked)} disabled={!aiAvailable || pending || !recommendations.length} />Share candidate lesson titles and audience/difficulty metadata (including my private lessons) and coarse curriculum preferences with the external AI provider for this request.</label>
      <p>No profile text, personal identifiers, grades, answers, or chats are sent. The shared daily AI generation allowance applies.</p>
      <button type="submit" className="auth-submit" disabled={!aiAvailable || !shareCourseContent || pending || !recommendations.length} aria-describedby={!aiAvailable ? "ai-access-notice" : undefined}>
        {pending ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}Generate AI path
      </button>
      <div aria-live="polite" aria-atomic="true">
        {pending && <p role="status">Generating a path...</p>}
        {!pending && state.error && <p ref={errorRef} tabIndex={-1} className="form-notice notice-error" role="alert">{state.error}</p>}
        {!pending && (changed || state.notice) && <p role="status">{changedNotice}</p>}
      </div>
      {!pending && currentPath && <section className="learning-section" aria-labelledby="generated-path-heading">
        <h3 ref={resultRef} tabIndex={-1} id="generated-path-heading">Generated path (not saved)</h3>
        <p>AI-selected order; explanations below use local recommendation rules.</p>
        <LessonList lessons={currentPath} />
      </section>}
    </section>
  </form>;
}