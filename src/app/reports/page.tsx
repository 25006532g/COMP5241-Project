import { LearnerShell } from "@/components/learner-shell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { database, displayName, isAdmin, isInstructor } from "@/lib/learning-server";
import { collectRows } from "@/lib/learning";
import { buildLessonReport, reportRows } from "@/lib/reporting";

export default async function Reports() {
  // Fresh getUser, fail closed on BOTH error and missing user before service access.
  // Keep this route's login/configuration UX without changing global auth helpers.
  const auth = await createClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) redirect("/login");
  const client = database();
  const reports = await (async () => {
    try {
      const permissions = reportRows.grants.parse(await collectRows((start, end) => client.from("forge_reviewers").select("lesson_id").eq("user_id", user.id).order("lesson_id").range(start, end)));
      let lessonsQuery = client.from("forge_lessons").select("id,title,version").eq("visibility", "public").order("id");
      if (isInstructor(user)) lessonsQuery = lessonsQuery.eq("owner_id", user.id);
      else if (!isAdmin(user)) lessonsQuery = lessonsQuery.in("id", permissions.map(permission => permission.lesson_id));
      const lessons = reportRows.lessons.parse(await collectRows((start, end) => lessonsQuery.range(start, end)));
      const ids = lessons.map(lesson => lesson.id);
      const [attemptData, enrollmentData] = ids.length ? await Promise.all([
        collectRows((start, end) => client.from("forge_attempts").select("id,user_id,lesson_id,original_lesson_id,lesson_title,lesson_version,certificate_kind,score,answers,questions,completed_at").in("lesson_id", ids).eq("certificate_kind", "public").order("completed_at", { ascending: false }).order("id").range(start, end)),
        collectRows((start, end) => client.from("forge_enrollments").select("user_id,lesson_id,enrollment_kind,attended_at,progress_evidence").in("lesson_id", ids).eq("enrollment_kind", "public").order("lesson_id").order("user_id").range(start, end)),
      ]) : [[], []];
      const attempts = reportRows.attempts.parse(attemptData);
      const enrollments = reportRows.enrollments.parse(enrollmentData);
      return lessons.map(lesson => ({ lesson, ...buildLessonReport(lesson, enrollments, attempts) }));
    } catch {
      throw new Error("Reports are unavailable. Could not load complete, valid learning records. Check the database migrations and try again.");
    }
  })();
  return <LearnerShell active="/reports" name={await displayName(user)} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <span className="eyebrow">INSTRUCTOR REPORTS</span><h1>Participation & results.</h1>
      {!reports.length && <p>No published lessons have been granted to your account for review.</p>}
      {reports.map(({ lesson, roster, history, reviewed, attended, passed }) => <section className="learning-section report-section" key={lesson.id}>
        <h2>{lesson.title}</h2><p><strong>Current lesson version {lesson.version}</strong></p>
        <h3>CURRENT PUBLIC ENROLLMENT ROSTER</h3>
        <p>{roster.length} learners · {reviewed} reviewed · {attended} attended · {passed} passed</p>
        <p>Counts use this roster and current version only, once per learner. These are independent evidence, not a funnel or proof of comprehension. Review is optional, not required for the quiz or a pass. No record means unknown, not never.</p>
        <ul className="report-roster">{roster.map(row => <li key={row.userId}>
          <h4>{row.userId}</h4>
          <dl className="report-evidence">
            <div><dt>REVIEWED</dt><dd>{row.evidence.reviewedAt ? "Acknowledged" : "No review record"}</dd></div>
            <div><dt>ATTENDED</dt><dd>{row.evidence.attendedAt ? "Final quiz reached" : "No quiz-reached record"}</dd></div>
            <div><dt>PASSED</dt><dd>{row.evidence.passed ? "Public saved pass (at least 60%)" : "No public saved pass record"}</dd></div>
          </dl>
        </li>)}</ul>
        {!roster.length && <p>No current public enrollments.</p>}
        <p>Unversioned attendance is not used here. Enrollment, bookmarks, visits and quiz results do not imply review or version-specific attendance.</p>
        <h3>Public attempt history (all versions)</h3>
        <p>{history.length} saved public attempts. Includes learners no longer in the public roster; those learners are excluded from the counts above. Each passing attempt remains an independent snapshot and certificate. Private attempts and private enrollments are excluded.</p>
        {!history.length && <p>No saved public attempts.</p>}
        {history.map(attempt => <details key={attempt.id}>
          <summary>{attempt.user_id} · Version {attempt.lesson_version} · {attempt.score}/{attempt.questions.length} · {new Date(attempt.completed_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}</summary>
          <p>Saved lesson title: {attempt.lesson_title}</p>
          <ol>{attempt.questions.map((question, index) => <li key={index}>
            <strong>{question.prompt}</strong><p>Selected: {question.options[attempt.answers[index]]}</p><p>Correct: {question.options[question.correct]}</p>
          </li>)}</ol>
        </details>)}
      </section>)}
    </div>
  </LearnerShell>;
}