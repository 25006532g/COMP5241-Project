import Link from "next/link";
import { LearnerShell } from "@/components/learner-shell";

export default function NeonRequiemPage() {
  return <LearnerShell active="/games/neon-requiem">
    <div className="portal-page game-page">
      <header className="portal-heading">
        <div>
          <span className="eyebrow">LEARNING GAME</span>
          <h1>Neon Requiem</h1>
          <p>Practice software development concepts through a cyber-hero adventure.</p>
        </div>
        <Link className="text-link" href="/dashboard">Back to dashboard</Link>
      </header>
      <section className="game-frame" aria-label="Neon Requiem learning game">
        <iframe title="Neon Requiem learning game" src="/games/neon-requiem.html" />
      </section>
    </div>
  </LearnerShell>;
}
