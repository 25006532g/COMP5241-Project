import { notFound } from "next/navigation";
import { LearnerShell } from "@/components/learner-shell";
import { DailyReflections } from "@/components/daily-reflections";
import { currentUser, isAdmin, isInstructor } from "@/lib/learning-server";
import { dailyReflectionsEnabled, hongKongDate } from "@/lib/reflections";
import { listReflections, readReflection } from "./actions";

export default async function Reflections() {
  if (!dailyReflectionsEnabled) notFound();
  const user = await currentUser().catch(() => null);
  if (!user) return <main className="portal-page">
    <h1>Reflections need a confirmed sign-in</h1>
    <p>We could not confirm your current account. No reflection data was loaded. Please sign in again when you are ready.</p>
    <a href="/login">Return to sign in</a>
  </main>;
  const date = hongKongDate();
  const [initial, history] = await Promise.all([readReflection({ date }), listReflections()]);
  return <LearnerShell active="/reflections" admin={isAdmin(user)} instructor={isInstructor(user)}>
    <div className="portal-page">
      <header className="portal-heading"><div><span className="eyebrow">PRIVATE · NO AI</span><h1>Daily 4D reflections</h1><p>A short record of your choices, descriptions, judgment and follow-through.</p></div></header>
      <DailyReflections key={user.id} owner={user.id} date={date} initial={initial} history={history} />
    </div>
  </LearnerShell>;
}
