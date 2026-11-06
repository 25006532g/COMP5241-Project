import { LearnerShell } from "@/components/learner-shell";
import { InterviewV2Lobby } from "@/components/interview-v2-lobby";
import { displayName, isAdmin, isInstructor, requireUser } from "@/lib/learning-server";
import { listMine } from "@/lib/interviews-v2-server";

export default async function InterviewV2Page() {
  const user = await requireUser();
  const history = await listMine();
  const staff = isAdmin(user) || isInstructor(user);
  return <LearnerShell active="/interviews-v2" name={await displayName(user)} admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <header className="portal-heading"><div><span className="eyebrow">QUESTION BANK</span><h1>Interview simulator v2</h1><p>Questions are chosen from the bank.</p></div></header>
      <InterviewV2Lobby sessions={history.code === "ok" ? history.rows : []} staff={staff} />
      {history.code !== "ok" && <p role="alert">Saved sessions could not be loaded.</p>}
    </div>
  </LearnerShell>;
}
