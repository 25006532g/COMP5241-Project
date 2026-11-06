import Link from "next/link";
import { GamePlayer } from "@/components/game-player";
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
      <section aria-label="Neon Requiem learning game">
        <GamePlayer />
      </section>
    </div>
  </LearnerShell>;
}
