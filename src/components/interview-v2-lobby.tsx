"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/app/interviews-v2/actions";
import { v2Notices, v2Profiles, type ProfileId, type V2Code } from "@/lib/interviews-v2";
import styles from "./interview-v2.module.css";

function stateLabel(state: string) {
  if (state === "intro") return "Introduction";
  if (state === "asking") return "In progress";
  if (state === "rating") return "Rating";
  if (state === "complete") return "Complete";
  return state;
}

export function InterviewV2Lobby({ sessions, staff = false }: {
  sessions: { id: string; profile_id: ProfileId; state: string; created_at: string }[];
  staff?: boolean;
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState<ProfileId>("cs_degree");
  const [notice, setNotice] = useState<V2Code | null>(null);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(true);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("forge-v2-voice");
      if (stored === "0" || stored === "1") setVoice(stored === "1");
    } catch { /* Keep the default when storage is blocked. */ }
  }, []);
  function chooseVoice(on: boolean) {
    setVoice(on);
    try { sessionStorage.setItem("forge-v2-voice", on ? "1" : "0"); } catch { /* Typing still works without storage. */ }
  }
  return <div className={styles.lobby}>
    <form className={`${styles.panel} ${styles.setup}`} onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      try {
        const result = await startSession({ profileId });
        setNotice(result.code);
        if (result.view) router.push(`/interviews-v2/${result.view.session.id}`);
      } catch { setNotice("unavailable"); }
      finally { setBusy(false); }
    }}>
      <h2>Choose who you are practicing as</h2>
      <fieldset className={styles.roles} id="v2-profile">
        <legend>Role</legend>
        {Object.entries(v2Profiles).map(([id, profile]) => <label key={id} className={styles.role}>
          <input type="radio" name="profile" value={id} checked={profileId === id} disabled={busy} onChange={() => setProfileId(id as ProfileId)} />
          <span><strong>{profile.label}</strong></span>
        </label>)}
      </fieldset>
      <label className={styles.optin}><input type="checkbox" checked={voice} disabled={busy} aria-describedby="v2-voice-note" onChange={event => chooseVoice(event.target.checked)} /> Use the microphone for my answers</label>
      <p className={styles.fine} id="v2-voice-note">The browser may send audio to its speech service. This app stores no audio. Only text you insert and then send is saved.</p>
      {!voice && <p className={styles.warn} role="status">Voice recording will not work if this is unticked.</p>}
      <button className="primary-button" disabled={busy}>Start interview</button>
      {staff && <p className={styles.staff}><Link href="/interviews-v2/bank">Edit the question bank</Link></p>}
      <p className={notice ? styles.notice : styles.status} role="status">{notice ? v2Notices[notice] : "Questions come from the tutor question bank."}</p>
    </form>
    <section className={styles.panel} aria-labelledby="v2-sessions-heading">
      <h2 id="v2-sessions-heading">Your sessions</h2>
      {sessions.length === 0 && <p className={styles.empty}>No simulator v2 sessions yet.</p>}
      <ul className={styles.sessions}>{sessions.map(session => <li key={session.id}>
        <Link className={styles.sessionLink} href={`/interviews-v2/${session.id}`}>
          <span className={styles.sessionCopy}>
            <strong>{v2Profiles[session.profile_id].label}</strong>
            <span>{stateLabel(session.state)} · {String(session.created_at).slice(0, 10)}</span>
          </span>
        </Link>
      </li>)}</ul>
    </section>
  </div>;
}
