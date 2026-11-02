import { LearnerShell } from "@/components/learner-shell";
import { InterviewHistory } from "@/components/interview-history";
import { currentUser, isAdmin, isInstructor } from "@/lib/learning-server";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { interviewHistory } from "@/lib/interviews-server";

export default async function Interviews() {
  const user = await currentUser();
  const [history, aiAvailable] = await Promise.all([
    interviewHistory(user.id).catch(() => null),
    requireAiAccess(user).then(() => true, () => false),
  ]);
  return <LearnerShell active="/interviews" admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <header className="portal-heading"><div><span className="eyebrow">PRIVATE PROGRAMMER INTERVIEW</span><h1>Interview simulator</h1><p>One question at a time. Formative feedback after eight answers, not a hiring decision. Optional browser dictation; text answers remain editable.</p></div></header>
      <InterviewHistory initialRows={history?.rows ?? []} initialCursor={history?.cursor ?? null} aiAvailable={aiAvailable} unavailable={!history} />
    </div>
  </LearnerShell>;
}
