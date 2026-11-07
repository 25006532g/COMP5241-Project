import Link from "next/link";
import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/learner-shell";
import { InterviewV2Bank } from "@/components/interview-v2-bank";
import { displayName, isAdmin, isInstructor, requireUser } from "@/lib/learning-server";
import { listBank } from "@/lib/interviews-v2-server";
import { v2Notices } from "@/lib/interviews-v2";

export default async function InterviewV2BankPage() {
  const user = await requireUser();
  if (!isAdmin(user) && !isInstructor(user)) notFound();
  const bank = await listBank();
  return <LearnerShell active="/interviews-v2/bank" name={await displayName(user)} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <header className="portal-heading"><div><span className="eyebrow">TUTORS AND ADMINISTRATORS</span><h1>Simulator question bank</h1><p>Edit questions, suggested answers, keywords, and read learner sessions.</p></div><Link href="/interviews-v2" className="primary-button">User view</Link></header>
      {bank.code === "ok" ? <InterviewV2Bank questions={bank.questions} sessions={bank.sessions} rubrics={bank.profiles} /> : <p role="alert">{v2Notices[bank.code]}</p>}
    </div>
  </LearnerShell>;
}
