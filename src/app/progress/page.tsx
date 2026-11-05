import Link from "next/link";
import { LearnerShell } from "@/components/learner-shell";
import { EvidenceSummary } from "@/components/learning-controls";
import { attemptOutcome, lessonProgress } from "@/lib/learning";
import { isInstructor, displayName, isAdmin, requireUser, userRecords, visibleLessons } from "@/lib/learning-server";

export default async function Progress() {
  const user = await requireUser();
  const [name, records, lessons] = await Promise.all([displayName(user), userRecords(user), visibleLessons(user)]);
  const average = records.attempts.length ? Math.round(records.attempts.reduce((total, attempt) => total + attempt.score / attemptOutcome(attempt).total * 100, 0) / records.attempts.length) : null;
  const passedCount = new Set(records.attempts.filter(attempt => attemptOutcome(attempt).passed).map(attempt => attempt.original_lesson_id)).size;
  const evidenceHistory = records.enrollments.map(enrollment => {
    const lesson = lessons.find(lesson => lesson.id === enrollment.lesson_id);
    const versions = new Set<number>([
      ...(lesson ? [lesson.version] : []),
      ...Object.keys(enrollment.progress_evidence ?? {}).filter(key => /^[1-9]\d*$/.test(key)).map(Number),
      ...records.attempts.filter(attempt => attempt.original_lesson_id === enrollment.lesson_id).map(attempt => attempt.lesson_version),
    ]);
    return { enrollment, lesson, versions: [...versions].sort((a, b) => b - a) };
  });
  const reviewedCount = evidenceHistory.filter(({ enrollment, versions }) => versions.some(version =>
    lessonProgress(enrollment, [], enrollment.lesson_id, version).reviewedAt)).length;
  return <LearnerShell active="/progress" name={name} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page"><span className="eyebrow">YOUR PROGRESS</span><h1>Your learning record.</h1>
      <section className="stat-grid">
        <div><strong>{records.enrollments.filter(record => record.attended_at).length}</strong><span>Lessons attended (any version; includes legacy)</span></div>
        <div><strong>{passedCount}</strong><span>Lessons passed (any version)</span></div>
        <div><strong>{average === null ? "Not yet" : `${average}%`}</strong><span>Average across attempts</span></div>
        <div><strong>{reviewedCount}</strong><span>Lessons explicitly reviewed (any version)</span></div>
      </section>
      <section className="learning-section"><h2>Review, attendance and pass history</h2>
        <p>Each version has separate evidence. A missing acknowledgement means review is unknown, not that the slides were never read. Bookmarks, enrollment and saved places do not prove review.</p>
        {!evidenceHistory.length && <p>No enrolled lesson evidence yet.</p>}
        {evidenceHistory.map(({ enrollment, lesson, versions }) => <article key={enrollment.lesson_id} className="evidence-history">
          <h3>{lesson ? <Link href={`/courses/${lesson.id}`}>{lesson.title}</Link> : "Unavailable lesson"}</h3>
          {!lesson && <p>This lesson is not currently accessible. No lesson content is shown.</p>}
          {enrollment.attended_at && <p>First attendance (any version): {new Date(enrollment.attended_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}. Legacy records may not identify the version.</p>}
          {!versions.length && <p>No version-specific evidence recorded; historical review unknown.</p>}
          {versions.map(version => <EvidenceSummary key={version} evidence={lessonProgress(enrollment, records.attempts, enrollment.lesson_id, version)} />)}
        </article>)}
      </section>
      <section className="learning-section"><h2>Quiz history</h2>{!records.attempts.length && <p>No quiz attempts yet.</p>}
        {records.attempts.map(attempt => {
          const outcome = attemptOutcome(attempt);
          return <div className="result-row" key={attempt.id}>
            <span><strong>{attempt.lesson_title}</strong><small>{attempt.certificate_kind === "private" ? "Private Self-Learning" : "Public Published Lesson"} · Version {attempt.lesson_version} · {new Date(attempt.completed_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}</small></span>
            <b>{attempt.score}/{outcome.total} · {outcome.passed ? "PASSED" : "Not passed"}</b>
            {outcome.passed && <a className="text-link" href={`/api/certificates/${attempt.id}`}>Certificate (HTML)</a>}
          </div>;
        })}
      </section>
      <section className="learning-section"><h2>Saved lessons ({records.bookmarks.length})</h2>
        {lessons.filter(lesson => records.bookmarks.some(bookmark => bookmark.lesson_id === lesson.id)).map(lesson => <p key={lesson.id}><Link href={`/courses/${lesson.id}`} className="text-link">{lesson.title}</Link></p>)}
        {!records.bookmarks.length && <p>No saved lessons yet.</p>}
      </section>
    </div>
  </LearnerShell>;
}