import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/learner-shell";
import { LearnerImport } from "@/components/learner-import";
import { LessonGeneration } from "@/components/lesson-generation";
import { isInstructor, accessibleLesson, canManageEnrollment, canPublishLessons, database, displayName, isAdmin, requireUser } from "@/lib/learning-server";
import { collectRows } from "@/lib/learning";

export const runtime = "nodejs";
export const maxDuration = 90;

export default async function Teaching({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const user = await requireUser();
  if (!canPublishLessons(user)) notFound();
  const { lesson: id } = await searchParams;
  const selected = id ? await accessibleLesson(id, user) : null;
  if (id && (!selected || !canManageEnrollment(user, selected))) notFound();
  const lessons = await collectRows((start, end) => {
    let query = database().from("forge_lessons").select("id,title").eq("visibility", "public");
    if (!isAdmin(user)) query = query.eq("owner_id", user.id);
    return query.order("title").order("id").range(start, end);
  });
  return <LearnerShell active="/teaching" name={await displayName(user)} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page"><span className="eyebrow">TEACHING</span><h1>Manage enrollment.</h1>
      <p><a href="/studio" className="secondary-button">Create lesson</a></p>
      <form method="get" className="learning-form"><label>Published lesson roster<select name="lesson" defaultValue={selected?.id ?? ""} required><option value="" disabled>Select a lesson</option>{lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label><button className="secondary-button" type="submit" disabled={!lessons.length}>Manage learners</button></form>
      {selected && <><h2>{selected.title}</h2><LearnerImport key={selected.id} lessonId={selected.id} /></>}
      <section className="learning-section"><h2>Teaching materials</h2>
        <LessonGeneration importing />
      </section>
    </div>
  </LearnerShell>;
}