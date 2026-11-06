import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { LearnerShell } from "@/components/learner-shell";
import { CatalogSearch } from "@/components/catalog-search";
import { LessonMetadata } from "@/components/lesson-metadata";
import { AUDIENCES, DIFFICULTIES, FAMILIES, filterLessons, readMetadata, subjectSelection, type CatalogFilters } from "@/lib/curriculum";
import styles from "@/components/lesson-metadata.module.css";
import { isInstructor, displayName, isAdmin, requireUser, userRecords, visibleLessons } from "@/lib/learning-server";

export default async function Catalog({ searchParams }: { searchParams: Promise<CatalogFilters> }) {
  const user = await requireUser();
  const [name, lessons, records, rawFilters] = await Promise.all([displayName(user), visibleLessons(user), userRecords(user), searchParams]);
  const filters = Object.fromEntries(["q", "subject", "audience", "difficulty", "visibility"].map(key => [key, typeof rawFilters[key as keyof CatalogFilters] === "string" ? rawFilters[key as keyof CatalogFilters] : ""])) as CatalogFilters;
  const matches = filterLessons(lessons, filters).map(lesson => ({ ...lesson, metadata: readMetadata(lesson.subject, lesson.metadata) }));
  const subjects = Array.from(new Set([...Object.values(FAMILIES), ...lessons.filter(lesson => !subjectSelection(lesson.subject)).map(lesson => lesson.subject)]));
  return <LearnerShell active="/catalog" name={name} admin={isAdmin(user)} instructor={isInstructor(user)}><div className="portal-page">
    <header className="portal-heading"><div><span className="eyebrow">LESSON CATALOG</span><h1>Find your next useful skill.</h1></div><Link className="secondary-button" href="/studio">Create a private lesson</Link></header>
    <form className={`catalog-filters ${styles.filters}`} action="/catalog">
      <CatalogSearch query={filters.q ?? ""} />
      <label>Subject<select name="subject" defaultValue={filters.subject}><option value="">All subjects</option>{subjects.map(subject => <option key={subject}>{subject}</option>)}</select></label>
      <label>Audience<select name="audience" defaultValue={filters.audience}><option value="">All / not specified</option>{Object.entries(AUDIENCES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Difficulty<select name="difficulty" defaultValue={filters.difficulty}><option value="">All / not specified</option>{Object.entries(DIFFICULTIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Visibility<select name="visibility" defaultValue={filters.visibility}><option value="">All available</option><option value="public">Public published</option><option value="private">My private lessons</option></select></label>
      <button className="auth-submit"><Search size={17} />Search</button><Link href="/catalog">Clear</Link>
    </form>
    <p>Lessons with unspecified metadata stay visible unless you choose a specific audience or difficulty. Audience filters include lessons marked for both groups.</p>
    <p role="status">{matches.length} matching {matches.length === 1 ? "lesson" : "lessons"}</p>
    <section className="catalog-grid">{matches.map(lesson => <article className="catalog-card" key={lesson.id}><header className="catalog-subject"><BookOpen size={22} aria-hidden="true" /><strong>{lesson.subject}</strong><span>{lesson.visibility === "private" ? "Private" : "Published"}</span></header><div className="catalog-copy"><h2>{lesson.title}</h2><p>{lesson.summary}</p><LessonMetadata subject={lesson.subject} metadata={lesson.metadata} /><Link href={records.enrollments.some(record => record.lesson_id === lesson.id) ? `/courses/${lesson.id}/lessons/1` : `/courses/${lesson.id}`}>{records.enrollments.some(record => record.lesson_id === lesson.id) ? "Continue lesson" : "View and enroll"}</Link></div></article>)}</section>
    {matches.length === 0 && <div className="empty-state"><h2>No matching lessons.</h2><Link href="/catalog" className="text-link">Clear all filters</Link></div>}
  </div></LearnerShell>;
}