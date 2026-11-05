import Link from "next/link";
import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/learner-shell";
import { ActionForm, BookmarkButton, EvidenceSummary } from "@/components/learning-controls";
import { enroll } from "@/app/learning/actions";
import { LessonMetadata } from "@/components/lesson-metadata";
import { readMetadata } from "@/lib/curriculum";
import { lessonProgress } from "@/lib/learning";
import { isInstructor, accessibleLesson, canEditLesson, displayName, isAdmin, requireUser, userRecords } from "@/lib/learning-server";

export default async function Course({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const lesson = await accessibleLesson(slug, user);
  if (!lesson) notFound();
  lesson.content.metadata = readMetadata(lesson.subject, lesson.content.metadata);
  const [name, records] = await Promise.all([displayName(user), userRecords(user)]);
  const enrollment = records.enrollments.find(record => record.lesson_id === lesson.id);
  const enrolled = Boolean(enrollment);
  const evidence = lessonProgress(enrollment, records.attempts, lesson.id, lesson.version);
  const total = lesson.content.questions.length;
  return <LearnerShell active="/catalog" name={name} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page"><Link href="/catalog" className="back-link">Back to catalog</Link>
      <section className="course-banner"><div>
        <span className="eyebrow">{lesson.visibility === "private" ? "PRIVATE SELF-LEARNING" : "PUBLIC PUBLISHED LESSON"} · {lesson.subject}</span>
        <h1>{lesson.title}</h1><p>{lesson.summary}</p>
        <p>Version {lesson.version} · {total ? `${total} quiz questions · ${Math.ceil(total * 0.6)} correct to pass (60%)` : "Slides only — no quiz or quiz certificate"}</p>
      </div></section>
      <LessonMetadata subject={lesson.subject} metadata={lesson.content.metadata} />
      <EvidenceSummary evidence={evidence} quizLength={total} />
      <div className="lesson-detail-actions">
        {enrolled ? <Link className="auth-submit" href={`/courses/${lesson.id}/lessons/1`}>Open lesson</Link> : <ActionForm action={enroll} label="Enroll in lesson"><input type="hidden" name="lessonId" value={lesson.id} /></ActionForm>}
        <BookmarkButton id={lesson.id} initial={records.bookmarks.some(record => record.lesson_id === lesson.id)} />
        {canEditLesson(user, lesson) && <a className="secondary-button" href={`/studio?edit=${lesson.id}`}>Edit lesson</a>}
      </div>
      <section className="learning-section"><h2>Lesson path</h2><ol>
        <li>Slides; optional explicit review acknowledgement</li>
        {lesson.content.template !== "slides" && <li>Ordering mini-game</li>}
        {total > 0 && <><li>{total}-question quiz with unlimited retries</li><li>{lesson.visibility === "private" ? "Private Self-Learning" : "Public Published Lesson"} certificate after passing</li></>}
      </ol></section>
    </div>
  </LearnerShell>;
}