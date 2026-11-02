"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { deleteInterview, finishInterview, readInterview, requestInterviewTurn } from "@/app/interviews/actions";
import { interviewDisclosure, interviewLimits, interviewNotices, interviewTopics, type Interview, type InterviewCode, type InterviewResult, type TurnRequest } from "@/lib/interviews";
import styles from "./interviews.module.css";

const InterviewDictation = dynamic(() => import("./interview-dictation").then(module => module.InterviewDictation), {
  ssr: false, loading: () => <p>Loading optional dictation. You can type instead.</p>,
});

export function InterviewPractice({ initial, aiAvailable }: { initial: Interview; aiAvailable: boolean }) {
  const [row, setRow] = useState<Interview | null>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [managing, setManaging] = useState(false);
  const [mustReload, setMustReload] = useState(false);
  const [aiDenied, setAiDenied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ code: InterviewCode } | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const epoch = useRef(0);
  const cancelDictation = useRef<(() => void) | null>(null);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (notice) status.current?.focus(); }, [notice]);
  useEffect(() => { if (confirmDelete) confirmButton.current?.focus(); }, [confirmDelete]);
  useEffect(() => () => { epoch.current++; }, []);
  function accept(result: InterviewResult) {
    if (result.code === "denied" || result.code === "auth") setAiDenied(true);
    setNotice({ code: result.code });
    if (result.interview) { setRow(result.interview); setMustReload(false); }
    else if (["save_unknown", "reserve_unknown", "finish_unknown", "delete_unknown", "connection", "conflict", "stale", "missing", "unavailable"].includes(result.code)) setMustReload(true);
  }
  async function reload() {
    cancelDictation.current?.();
    const ticket = ++epoch.current;
    setSending(false); setManaging(true);
    try {
      const result = await readInterview({ id: initial.id });
      if (ticket !== epoch.current) return;
      accept(result);
      if (result.code === "missing") setRow(null);
    } catch { if (ticket === epoch.current) accept({ code: "connection" }); }
    finally { if (ticket === epoch.current) setManaging(false); }
  }
  async function infer(mode: TurnRequest["mode"]) {
    cancelDictation.current?.();
    if (!row) return;
    const ticket = ++epoch.current;
    const turnId = mode === "retry" ? row.turns.at(-1)!.id : crypto.randomUUID();
    const base = { id: row.id, revision: row.revision, requestId: crypto.randomUUID(), turnId };
    const request: TurnRequest = mode === "answer" ? { ...base, mode, text: draft } : { ...base, mode };
    setSending(true);
    setNotice(null);
    try {
      const result = await requestInterviewTurn(request);
      if (ticket !== epoch.current) return;
      accept(result);
      if (mode === "answer" && result.interview?.turns.some(turn => turn.id === turnId && turn.learner === draft.trim())) setDraft("");
    } catch { if (ticket === epoch.current) accept({ code: "connection" }); }
    finally { if (ticket === epoch.current) setSending(false); }
  }
  async function manage(operation: "finish" | "delete") {
    cancelDictation.current?.();
    if (!row) return;
    const ticket = ++epoch.current;
    setSending(false); setManaging(true);
    try {
      let result: InterviewResult;
      if (operation === "delete") result = await deleteInterview({ id: row.id });
      else {
        // Reservation may have advanced the revision while the provider was running.
        const canonical = await readInterview({ id: row.id });
        result = canonical.interview ? await finishInterview({ id: row.id, revision: canonical.interview.revision }) : canonical;
      }
      if (ticket !== epoch.current) return;
      if (result.code === "deleted") {
        setRow(null); setDraft(""); setConfirmDelete(false); setMustReload(false);
      }
      accept(result);
    } catch { if (ticket === epoch.current) accept({ code: "connection" }); }
    finally { if (ticket === epoch.current) setManaging(false); }
  }
  const last = row?.turns.at(-1);
  const blocked = sending || managing || mustReload || !aiAvailable || aiDenied;
  return <div className={styles.root}>
    <Link href="/interviews">← Private interview history</Link>
    <p>{interviewDisclosure}</p>
    <p className={styles.limits}>{interviewLimits} Transcript storage: 128 KiB; provider context: 12,000 characters; text completion: 600 tokens.</p>
    {(!aiAvailable || aiDenied) && <p>{interviewNotices.denied}</p>}
    <p ref={status} role="status" tabIndex={-1} className={styles.notice}>{sending
      ? "Sending — your answer or opening request is not yet confirmed saved here. Do not resubmit; you can reload to check storage."
      : notice ? interviewNotices[notice.code] : "Only confirmed saved conversation text appears below."}</p>
    {row && <>
      <h2>{interviewTopics[row.topic]} — {row.level}</h2>
      <p>State: {row.state} · {row.turns.filter(t => t.kind === "answer").length}/8 answers</p>
      <ol className={styles.transcript} aria-label="Saved interview transcript">{row.turns.map(turn => <li key={turn.id}>
        {turn.learner !== null && <div><strong>You · saved</strong><p>{turn.learner}</p></div>}
        {turn.status === "complete" && <div className={styles.reply}><strong>Interviewer · saved</strong><p>{turn.assistant}</p></div>}
        {turn.status !== "complete" && <p>{turn.kind === "opening" ? "Opening request saved. " : ""}{
          turn.status === "pending" ? "Reply pending or lease expired. Reload to check; retry is explicit and uses another request." :
          turn.status === "failed" ? "No reply saved. Your saved answer is kept for retry." : "Request cancelled by finishing. No reply saved."
        } Attempts: {turn.attempts.length}/3.</p>}
      </li>)}</ol>
      {row.state === "ready" && <button className="primary-button" disabled={blocked} onClick={() => infer("start")}>Ask first question</button>}
      {row.state === "active" && last?.status === "complete" && <form className="learning-form" onSubmit={event => { event.preventDefault(); void infer("answer"); }}>
        <label>Your answer (saved only after server confirmation)
          <textarea ref={answerInput} value={draft} maxLength={1200} required rows={5} disabled={blocked}
            onChange={event => setDraft(event.target.value)} aria-describedby="interview-answer-limit" />
        </label>
        <small id="interview-answer-limit">{draft.length}/1,200 characters. Enter adds a new line; use Send answer to submit.</small>
        <button className="primary-button" disabled={blocked || !draft.trim()}>Send answer</button>
        {!blocked && <InterviewDictation key={`${row.id}:${row.revision}`} draft={draft} cancelRef={cancelDictation}
          insert={text => { setDraft(text); answerInput.current?.focus(); }} />}
      </form>}
      {row.state === "active" && last && ["pending", "failed"].includes(last.status) && <div>
        <p>Retry uses the saved answer, never a replacement. A pending attempt can be retried only after its database-time 75-second lease. If another interview is pending, finish, retry or delete that interview first.</p>
        <button disabled={blocked || last.attempts.length >= 3} onClick={() => infer("retry")}>Retry saved turn</button>
      </div>}
      {row.state === "completed" && <p>Interview simulator finished. Any saved formative feedback above remains available; no score or hiring decision is issued. Finishing early makes no further AI request and does not invent final feedback.</p>}
      <div className={styles.toolbar}>
        <button disabled={managing} onClick={reload}>Reload saved interview</button>
        {row.state !== "completed" && <button disabled={managing} onClick={() => manage("finish")}>Finish interview</button>}
        <button ref={deleteButton} className="delete-button" disabled={managing} onClick={() => { cancelDictation.current?.(); setConfirmDelete(true); }}>Delete interview</button>
      </div>
      {confirmDelete && <section className={styles.confirm} aria-label="Confirm interview deletion">
        <p>Permanently delete this private transcript? This cannot be undone. A provider request already sent cannot be retracted.</p>
        <div className={styles.toolbar}><button ref={confirmButton} className="delete-button" disabled={managing} onClick={() => manage("delete")}>Delete permanently</button>
          <button disabled={managing} onClick={() => { setConfirmDelete(false); deleteButton.current?.focus(); }}>Keep interview</button></div>
      </section>}
    </>}
  </div>;
}
