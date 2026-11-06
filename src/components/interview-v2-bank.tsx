"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { importQuestions, saveQuestion, saveRubric } from "@/app/interviews-v2/actions";
import { v2Notices, v2Profiles, type ProfileId, type V2Code } from "@/lib/interviews-v2";
import styles from "./interview-v2.module.css";

type Question = { id: string; profile_id: string; prompt: string; sample_answer: string; keywords: string[] | null; related_ids: string[] | null; kind: "primary" | "followup"; active: boolean; sort_order: number };
type Session = { id: string; owner_id: string; profile_id: string; state: string; created_at: string; learner: string };

export function InterviewV2Bank({ questions, sessions, rubrics }: {
  questions: Question[]; sessions: Session[]; rubrics: { id: ProfileId; intro_rubric: string }[];
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState<ProfileId>("frontend_engineer");
  const [notice, setNotice] = useState<V2Code | null>(null);
  const [jsonText, setJsonText] = useState("");
  const mine = questions.filter(question => question.profile_id === profileId);
  const activeCount = mine.filter(question => question.active).length;
  const rubric = rubrics.find(row => row.id === profileId)?.intro_rubric ?? "";
  async function report(result: { code: V2Code }) {
    setNotice(result.code);
    if (result.code === "ok") router.refresh();
  }
  return <div className={styles.bankPage}>
    <section className={styles.panel}>
      <label className={styles.field} htmlFor="bank-profile">Profile
        <select id="bank-profile" value={profileId} onChange={event => setProfileId(event.target.value as ProfileId)}>
          {Object.entries(v2Profiles).map(([id, profile]) => <option key={id} value={id}>{profile.label}</option>)}
        </select>
      </label>
      <p className={styles.quota}>{activeCount} / 40 active <span>{v2Profiles[profileId].interviewer === "professor" ? "Professor interview" : "Senior engineer interview"}</span></p>
      <div className={styles.meter} aria-hidden="true"><span style={{ width: `${Math.min(100, (activeCount / 40) * 100)}%` }} /></div>
    </section>
    <div className={styles.bankGrid}>
      <form className={`${styles.panel} ${styles.bank}`} onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const keywords = String(form.get("keywords") ?? "").split(",").map(item => item.trim()).filter(Boolean);
        const relatedIds = form.getAll("related").map(String);
        await report(await saveQuestion({
          id: crypto.randomUUID(), profileId, prompt: String(form.get("prompt") ?? ""), sampleAnswer: String(form.get("sample") ?? ""),
          keywords, relatedIds, kind: String(form.get("kind") ?? "primary"), active: true, sortOrder: mine.length,
        }));
        event.currentTarget.reset();
      }}>
        <h2>Add a question</h2>
        <label className={styles.field}>Prompt<textarea name="prompt" required minLength={1} maxLength={2000} rows={3} /></label>
        <label className={styles.field}>Suggested answer<textarea name="sample" required minLength={1} maxLength={4000} rows={3} /></label>
        <label className={styles.field}>Keywords, comma separated<input name="keywords" /></label>
        <label className={styles.field}>Related questions
          <select name="related" multiple size={4}>{mine.map(question => <option key={question.id} value={question.id}>{question.prompt.slice(0, 80)}</option>)}</select>
          <span className={styles.hint}>Hold Ctrl or Command to choose more than one.</span>
        </label>
        <label className={styles.field}>Kind<select name="kind" defaultValue="primary"><option value="primary">Primary</option><option value="followup">Follow-up only</option></select></label>
        <button className="primary-button">Save</button>
      </form>
      <div className={styles.stack}>
        <form className={`${styles.panel} ${styles.bank}`} onSubmit={async event => {
          event.preventDefault();
          await report(await saveRubric({ profileId, rubric: String(new FormData(event.currentTarget).get("rubric") ?? "") }));
        }}>
          <h2>Introduction rubric</h2>
          <label className={styles.field}>Rubric<textarea name="rubric" required defaultValue={rubric} maxLength={2000} rows={4} /></label>
          <button className="primary-button">Save rubric</button>
        </form>
        <form className={`${styles.panel} ${styles.bank}`} onSubmit={async event => {
          event.preventDefault();
          try { await report(await importQuestions(JSON.parse(jsonText))); }
          catch { setNotice("invalid"); }
        }}>
          <h2>Import JSON</h2>
          <textarea className={styles.jsonBox} value={jsonText} onChange={event => setJsonText(event.target.value)} rows={8} aria-label="Question bank JSON" />
          <button className="primary-button">Import JSON</button>
        </form>
      </div>
    </div>
    <p className={notice ? styles.notice : styles.status} role="status">{notice ? v2Notices[notice] : "Import adds questions for the profile named in the file."}</p>
    <section className={styles.panel} aria-labelledby="v2-bank-questions">
      <div className={styles.listHead}>
        <h2 id="v2-bank-questions">Questions</h2>
        <span>{mine.length} in this profile</span>
      </div>
      {mine.length === 0 && <p className={styles.empty}>No questions for this profile yet.</p>}
      <ul className={styles.questions}>{mine.map(question => <li className={styles.question} key={question.id}>
        <div className={styles.turnHead}>
          <span className={question.active ? styles.badge : styles.badgeMuted}>{question.active ? "Active" : "Hidden"}</span>
          <span className={styles.badgeMuted}>{question.kind === "primary" ? "Primary" : "Follow-up"}</span>
        </div>
        <p>{question.prompt}</p>
      </li>)}</ul>
    </section>
    <section className={styles.panel} aria-labelledby="v2-learner-sessions">
      <h2 id="v2-learner-sessions">Learner sessions</h2>
      {sessions.length === 0 && <p className={styles.empty}>No learner sessions yet.</p>}
      <ul className={styles.sessionList}>{sessions.map(session => <li className={styles.sessionRow} key={session.id}>
        <div>
          <strong>{session.learner}</strong>
          <span>{String(session.created_at).slice(0, 10)} · {v2Profiles[session.profile_id as ProfileId].label} · {session.state}</span>
        </div>
        <Link href={`/interviews-v2/${session.id}`}>Open</Link>
      </li>)}</ul>
    </section>
  </div>;
}
