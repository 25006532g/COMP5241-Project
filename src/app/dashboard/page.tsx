import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { isInstructor, displayName, isAdmin, userRecords, visibleLessons } from "@/lib/learning-server";
import { loadSetup } from "@/lib/onboarding-server";
import { attemptOutcome, lessonProgress } from "@/lib/learning";

export default async function Dashboard() {
  const setup = await loadSetup();
  if (setup.code !== "ok") return <LearnerShell active="/dashboard"><div className="portal-page">
    <h1>Learning setup unavailable.</h1><p role="alert" className="form-notice notice-error">{setup.message}</p>
    <p><a className="text-link" href="/dashboard">Try loading again</a></p>
    <p><Link className="text-link" href="/profile">Profile, export & deletion</Link></p>
    <p><Link className="text-link" href="/login">Log in / account recovery</Link></p>
  </div></LearnerShell>;
  if (!setup.profile.onboarding_completed_at) redirect("/onboarding");
  const user = setup.user;
  const [name, lessons, records] = await Promise.all([displayName(user), visibleLessons(user), userRecords(user)]);
  const enrolled = lessons.filter(lesson => records.enrollments.some(record => record.lesson_id === lesson.id));
  const passedCount = new Set(records.attempts.filter(attempt => attemptOutcome(attempt).passed).map(attempt => attempt.original_lesson_id)).size;
  return <LearnerShell active="/dashboard" name={name} admin={isAdmin(user)} instructor={isInstructor(user)}><div className="portal-page"><header className="portal-heading"><div><span className="eyebrow">MY LEARNING</span><h1>Welcome, {name}.</h1><p>{enrolled.length} enrolled lessons · {passedCount} passed (any version)</p></div><Link className="secondary-button" href="/studio"><Plus size={17} />Create a lesson</Link></header>{enrolled.length === 0 ? <section className="empty-state"><BookOpen size={32} /><h2>No lessons yet.</h2><Link className="text-link" href="/catalog">Find a lesson to enroll in</Link></section> : <div className="learning-list">{enrolled.map(lesson => { const progress = lessonProgress(records.enrollments.find(record => record.lesson_id === lesson.id), records.attempts, lesson.id, lesson.version); return <Link key={lesson.id} href={`/courses/${lesson.id}/lessons/1`}><div><span className="eyebrow">{lesson.visibility} · {lesson.subject}</span><h2>{lesson.title}</h2><p>{lesson.summary}</p></div><strong>Version {lesson.version} · {progress.passed ? "Passed" : progress.attendedAt ? "Attended · Continue" : progress.reviewedAt ? "Reviewed · Continue" : "Continue"}</strong></Link>; })}</div>}</div></LearnerShell>;
}