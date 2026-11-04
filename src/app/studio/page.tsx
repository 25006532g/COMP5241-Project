import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/learner-shell";
import { ActionForm, LessonEditor } from "@/components/learning-controls";
import { SlideLessonEditor, UploadLessonPage } from "@/components/create-lesson";
import { fromStoredLesson } from "@/lib/slide-lesson";
import { requestReview, updateLesson } from "@/app/learning/actions";
import { collectRows } from "@/lib/learning";
import { isInstructor, accessibleLesson, database, displayName, isAdmin, requireUser, canEditLesson, canPublishLessons } from "@/lib/learning-server";

export const runtime = "nodejs";
export const maxDuration = 90;

export default async function Studio({ searchParams }: { searchParams: Promise<{ edit?: string; manual?: string; upload?: string }> }) {
  const user = await requireUser();
  const { edit, manual, upload } = await searchParams;
  const lesson = edit ? await accessibleLesson(edit, user, true) : null;
  if (edit && (!lesson || !canEditLesson(user, lesson))) notFound();
  const owned = lesson ? [] : await collectRows((start, end) => database().from("forge_lessons")
    .select("id,title,subject,visibility,version")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range(start, end));
  return <LearnerShell active="/studio" name={await displayName(user)} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page studio-editor">
      <header className="portal-heading"><div><span className="eyebrow">LESSON STUDIO</span><h1>{lesson ? "Edit lesson." : upload === "1" ? "Upload a file." : manual === "1" ? "Write a lesson." : "Create a lesson."}</h1></div></header>
      {!lesson && manual !== "1" && upload !== "1" && <section className="learning-section"><h2>Your lessons</h2>
        <p>Only lessons you created are listed here.</p>
        {!owned.length && <p>You have not created a lesson yet.</p>}
        <div className="learning-list">{owned.map(item => <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.subject} · {item.visibility} · Version {item.version}</p>
          <a className="text-link" href={`/studio?edit=${item.id}`}>Edit lesson</a>
        </div>)}</div>
      </section>}
      {!lesson && manual !== "1" && upload !== "1" && <section className="learning-section" aria-labelledby="create-heading">
        <h2 id="create-heading">How to create a lesson</h2>
        <ol>
          <li>
            <strong>Write your own lesson.</strong>
            <p>Open a blank lesson, preview each slide as you write it, then save it or send it for approval.</p>
            <p><a className="secondary-button" href="/studio?manual=1">Start a blank manual lesson</a></p>
          </li>
          <li>
            <strong>Or upload a file.</strong>
            <p>Open a page to copy text from a file, or import a PowerPoint as slides. You can preview the slides before you save.</p>
            <p><a className="secondary-button" href="/studio?upload=1">Upload a file</a></p>
          </li>
        </ol>
      </section>}
      {!lesson && upload === "1" && <UploadLessonPage />}
      {lesson ? <>
        {lesson.content.template === "slides"
          ? <SlideLessonEditor key={`${lesson.id}-${lesson.version}`} lessonId={lesson.id} version={lesson.version} initial={fromStoredLesson(lesson.content)} />
          : <LessonEditor key={`${lesson.id}-${lesson.version}`} id={lesson.id} version={lesson.version} initial={lesson.content} action={updateLesson} admin={canPublishLessons(user)} />}
        {lesson.owner_id === user.id && lesson.visibility === "private" && !canPublishLessons(user) && <section className="learning-section"><h2>Publication review</h2><p>Submitting grants administrators access to this draft and permission to publish it for all learners.</p><ActionForm action={requestReview} label="Submit for publication review"><input type="hidden" name="lessonId" value={lesson.id} /></ActionForm></section>}
      </> : manual === "1" ? <SlideLessonEditor key="blank" /> : null}
    </div>
  </LearnerShell>;
}