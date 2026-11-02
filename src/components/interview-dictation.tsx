"use client";

import { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import styles from "./interviews.module.css";

// The library's recognizer is global. Never consume its global transcript, and
// do not hand ownership to another turn until the native end event arrives.
let owner: object | null = null;

export function InterviewDictation({ draft, insert, cancelRef }: {
  draft: string; insert: (text: string) => void;
  cancelRef: { current: (() => void) | null };
}) {
  const { browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition({ transcribing: false });
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Optional. Typing is always available.");
  const previewInput = useRef<HTMLTextAreaElement>(null);
  const focusPreview = useRef(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const cancel = useRef<() => void>(() => {});
  const mounted = useRef(true);
  useEffect(() => {
    if (!active && focusPreview.current) {
      focusPreview.current = false;
      previewInput.current?.focus();
    }
  }, [active]);
  useEffect(() => {
    mounted.current = true;
    const stop = () => cancel.current();
    const hidden = () => { if (document.hidden) stop(); };
    cancelRef.current = stop;
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    return () => {
      mounted.current = false;
      stop();
      cancelRef.current = null;
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stop);
    };
  }, [cancelRef]);

  async function start() {
    if (!consent || owner || active || !browserSupportsSpeechRecognition || !isMicrophoneAvailable) {
      setMessage("Dictation unavailable or still stopping. You can type instead.");
      return;
    }
    const recognition = SpeechRecognition.getRecognition();
    if (!recognition) return;
    const ticket = {};
    owner = ticket;
    let accepting = true;
    let ended = false;
    let cancelled = false;
    setActive(true); setPreview(""); setMessage("Listening in English (en-US). Stop to review; nothing is sent as an answer.");
    const result = (event: SpeechRecognitionEvent) => {
      if (!accepting || !mounted.current || owner !== ticket) return;
      // Replace the snapshot (including interim text), never append repeated results.
      setPreview(Array.from(event.results, item => item[0].transcript.trim()).filter(Boolean).join(" "));
    };
    const end = () => {
      ended = true;
      accepting = false;
      recognition.removeEventListener("result", result);
      recognition.removeEventListener("error", error);
      recognition.removeEventListener("end", end);
      if (owner === ticket) owner = null;
      if (mounted.current) {
        setActive(false);
        if (!cancelled) {
          focusPreview.current = true;
          setMessage("Stopped. Review/edit the preview, then insert or discard. Send answer is separate.");
        }
      }
    };
    const abort = () => {
      cancelled = true;
      accepting = false;
      if (mounted.current) { setActive(false); setMessage("Dictation stopped. Review the existing preview or type instead."); }
      if (!ended && owner === ticket) void SpeechRecognition.abortListening();
    };
    const error = (event: SpeechRecognitionErrorEvent) => {
      abort();
      if (mounted.current) setMessage(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone permission denied. Type instead; check browser permissions before trying again."
        : `Dictation unavailable (${event.error}). Type instead. No answer was sent.`);
    };
    cancel.current = abort;
    recognition.addEventListener("result", result);
    recognition.addEventListener("end", end);
    recognition.addEventListener("error", error);
    try {
      await SpeechRecognition.startListening({ continuous: false, language: "en-US" });
      if (!accepting && !ended) void SpeechRecognition.abortListening();
    } catch {
      abort();
      if (mounted.current) setMessage("Could not start dictation. Type instead.");
    }
  }
  const combined = [draft, preview.trim()].filter(Boolean).join(draft ? "\n" : "");
  const overflow = combined.length > 1200;
  return <section className={styles.dictation} aria-label="Optional answer dictation">
    <h3>Optional English dictation</h3>
    <p id="dictation-disclosure">Your browser may send audio to its vendor&apos;s speech service. This is not guaranteed offline or accurate, and support varies. This app stores no raw audio. Only text you insert, review and explicitly Send becomes an interview answer.</p>
    {!browserSupportsSpeechRecognition ? <p role="status">Speech recognition is unsupported in this browser. Type your answer instead.</p> : <>
      <label><input type="checkbox" checked={consent} disabled={active} aria-describedby="dictation-disclosure"
        onChange={event => { setConsent(event.target.checked); if (!event.target.checked) cancel.current(); }} /> I opt in to browser-vendor speech processing for this answer.</label>
      {!isMicrophoneAvailable && <p>Microphone unavailable or permission denied. Type instead.</p>}
      <div className={styles.toolbar}>
        <button ref={startButton} type="button" disabled={!consent || active || !isMicrophoneAvailable || !!preview}
          onClick={() => void start()}>Start dictation</button>
        <button type="button" disabled={!active} onClick={() => {
          setMessage("Stopping dictation…");
          void SpeechRecognition.stopListening();
        }}>Stop dictation</button>
      </div>
      <label>Dictation preview (not saved)
        <textarea ref={previewInput} rows={4} value={preview} disabled={active} onChange={event => setPreview(event.target.value)} aria-describedby="dictation-length" />
      </label>
      <p id="dictation-length" role="status">{combined.length}/1,200 characters after insertion. {overflow && "Too long: edit the preview or answer, or discard. Nothing will be truncated."}</p>
      <div className={styles.toolbar}>
        <button type="button" disabled={active || !preview.trim() || overflow} onClick={() => {
          cancel.current(); insert(combined); setPreview(""); setMessage("Inserted into your editable answer. Review it before Send.");
        }}>Insert into answer</button>
        <button type="button" disabled={active || !preview} onClick={() => {
          cancel.current(); setPreview(""); setMessage("Preview discarded. Your typed answer is unchanged."); startButton.current?.focus();
        }}>Discard dictation</button>
      </div>
    </>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
