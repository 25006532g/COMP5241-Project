import Link from "next/link";
import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/learner-shell";
import { InterviewV2Room } from "@/components/interview-v2-room";
import { displayName, isAdmin, isInstructor, requireUser } from "@/lib/learning-server";
import { readSession } from "@/lib/interviews-v2-server";
import { v2Notices } from "@/lib/interviews-v2";

export default async function InterviewV2SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = await readSession({ id });
  if (result.code === "invalid") notFound();
  return <LearnerShell active="/interviews-v2" name={await displayName(user)} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <header className="portal-heading"><div><span className="eyebrow">SIMULATOR V2</span><h1>Interview room</h1></div></header>
      {result.view ? <InterviewV2Room key={`${result.view.session.id}-${result.view.session.revision}`} initial={result.view} /> : <>
        <p role="alert">{v2Notices[result.code]}</p>
        <Link href="/interviews-v2">Back to simulator v2</Link>
      </>}
    </div>
  </LearnerShell>;
}
