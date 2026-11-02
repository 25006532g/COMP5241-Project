import Link from "next/link";
import { LearnerShell } from "@/components/learner-shell";
import { InterviewPractice } from "@/components/interview-practice";
import { currentUser, isAdmin, isInstructor } from "@/lib/learning-server";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { ownedInterview } from "@/lib/interviews-server";
import { interviewIdSchema, interviewNotices } from "@/lib/interviews";

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const parsed = interviewIdSchema.safeParse(await params);
  const [result, aiAvailable] = await Promise.all([
    parsed.success ? ownedInterview(user.id, parsed.data.id).then(interview => ({ interview, unavailable: false }), () => ({ interview: null, unavailable: true })) :
      Promise.resolve({ interview: null, unavailable: false }),
    requireAiAccess(user).then(() => true, () => false),
  ]);
  return <LearnerShell active="/interviews" admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <header className="portal-heading"><div><span className="eyebrow">PRIVATE PROGRAMMER INTERVIEW</span><h1>Interview simulator</h1><p>One question at a time; feedback after answer eight. Finish early without requesting feedback.</p></div></header>
      {result.interview ? <InterviewPractice key={result.interview.id} initial={result.interview} aiAvailable={aiAvailable} /> :
        <><p role="alert">{result.unavailable ? interviewNotices.unavailable : interviewNotices.missing}</p><Link href="/interviews">Return to private history</Link></>}
    </div>
  </LearnerShell>;
}
