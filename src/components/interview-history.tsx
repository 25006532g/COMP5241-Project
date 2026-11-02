"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createInterview, listInterviews } from "@/app/interviews/actions";
import { interviewDisclosure, interviewLimits, interviewNotices, interviewTopics, type HistoryCursor, type InterviewCode, type InterviewMetadata } from "@/lib/interviews";
import styles from "./interviews.module.css";

export function InterviewHistory({ initialRows, initialCursor, aiAvailable, unavailable = false }: {
  initialRows: InterviewMetadata[]; initialCursor: HistoryCursor; aiAvailable: boolean; unavailable?: boolean;
}) {
  const [{ rows, cursor, older }, setHistory] = useState({ rows: initialRows, cursor: initialCursor, older: false });
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [uncertain, setUncertain] = useState(unavailable);
  const [notice, setNotice] = useState<{ code: InterviewCode; message?: string } | null>(unavailable ? { code: "unavailable" } : null);
  const [created, setCreated] = useState<string | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (notice) status.current?.focus(); }, [notice]);
  async function refresh(next: HistoryCursor = null): Promise<InterviewCode> {
    try {
      const result = await listInterviews(next);
      if (result.code === "ok" && result.rows) {
        setHistory({ rows: result.rows, cursor: result.cursor, older: next !== null });
        setUncertain(false);
      }
      return result.code;
    } catch { return "connection"; }
  }
  async function load(next: HistoryCursor = null) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      const code = await refresh(next);
      setNotice({ code });
      if (code === "connection") setUncertain(true);
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <div className={styles.root}>
    <p>{interviewDisclosure}</p>
    <p className={styles.limits}>{interviewLimits} Transcript storage: 128 KiB; provider context: 12,000 characters; text completion: 600 tokens.</p>
    {!aiAvailable && <p>{interviewNotices.denied}</p>}
    <form className={`learning-form ${styles.create}`} onSubmit={async event => {
      event.preventDefault();
      if (inFlight.current || uncertain || !aiAvailable) return;
      const form = new FormData(event.currentTarget);
      inFlight.current = true; setBusy(true); setCreated(null);
      try {
        const result = await createInterview({ id: crypto.randomUUID(), topic: form.get("topic"), level: form.get("level") });
        setNotice({ code: result.code });
        if (result.code === "ok" && result.interview) {
          setCreated(result.interview.id);
          setNotice({ code: "ok", message: "Saved privately. Refreshing latest history…" });
          // The canonical page and its boundary must move together, even from an older page.
          const code = await refresh();
          setNotice({ code: "ok", message: code === "ok"
            ? "Saved privately. Showing latest history."
            : "Saved privately. Latest history could not be refreshed; the previous page is unchanged. Open the new interview or reload latest history. No need to create it again." });
        } else if (result.code === "create_unknown") setUncertain(true);
      } catch { setNotice({ code: "connection" }); setUncertain(true); }
      finally { inFlight.current = false; setBusy(false); }
    }}>
      <h2>New interview simulator</h2>
      <p>Choose a focus and difficulty. Answer one original question at a time; formative feedback follows only the eighth answer. Coursework and hypothetical experience are welcome. Avoid personal or confidential details.</p>
      <label htmlFor="interview-topic">Focus</label><select id="interview-topic" name="topic" disabled={busy}>{Object.entries(interviewTopics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <label htmlFor="interview-level">Difficulty</label><select id="interview-level" name="level" defaultValue="foundation" disabled={busy}>{["new", "foundation", "intermediate", "advanced"].map(level => <option key={level} value={level}>{level}</option>)}</select>
      <button className="primary-button" disabled={!aiAvailable || busy || uncertain}>Create private interview</button>
    </form>
    <p ref={status} tabIndex={-1} role="status" className={styles.notice}>{notice ? notice.message ?? interviewNotices[notice.code] : "Create an empty interview, then open it to request the first question."}</p>
    {created && <Link className="primary-button" href={`/interviews/${created}`}>Open new interview</Link>}
    <section aria-labelledby="interview-history">
      <div className={styles.toolbar}><h2 id="interview-history">Your private history</h2><button onClick={() => load()} disabled={busy}>Reload latest history</button></div>
      <p>{older ? "Showing older interviews." : "Showing latest interviews."} Creating an interview reloads the latest page.</p>
      {uncertain && <p>Reload to reconcile storage before creating another interview. An uncertain creation is never automatically replayed.</p>}
      {rows.length === 0 && !uncertain && <p>No saved interviews on this page.</p>}
      <ul className={styles.history}>{rows.map(row => <li key={row.id}>
        <Link href={`/interviews/${row.id}`}>{interviewTopics[row.topic]} — {row.level}</Link>
        <span>{row.state} · {row.created_at.slice(0, 10)}</span>
      </li>)}</ul>
      {cursor && <button disabled={busy} onClick={() => load(cursor)}>Older interviews</button>}
    </section>
  </div>;
}
