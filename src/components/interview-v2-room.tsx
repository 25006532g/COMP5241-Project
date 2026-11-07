"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { changeQuestion, endSession, skipIntro, submitAnswer, submitIntro } from "@/app/interviews-v2/actions";
import { InterviewV2Dictation } from "@/components/interview-v2-dictation";
import { sessionQuestionCap, v2Notices, wordCount, type V2Code, type V2View } from "@/lib/interviews-v2";
import styles from "./interview-v2.module.css";

type Look = "male" | "female";
const roomArt = {
  office: "/interviews-v2/room/05-office-background.png",
  table: "/interviews-v2/room/06-table.png",
  interviewer: {
    male: "/interviews-v2/room/01-interviewer-male.png",
    female: "/interviews-v2/room/02-interviewer-female.png",
  },
  interviewee: {
    male: "/interviews-v2/room/03-interviewee-male-back.png",
    female: "/interviews-v2/room/04-interviewee-female-back.png",
  },
} as const;
const artSize = {
  interviewer: { male: [799, 982], female: [728, 961] },
  interviewee: { male: [807, 878], female: [706, 880] },
} as const;

function storedLook(key: string): Look | null {
  try {
    const value = sessionStorage.getItem(key);
    return value === "male" || value === "female" ? value : null;
  } catch { return null; }
}

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function englishVoice(synth: SpeechSynthesis) {
  const voices = synth.getVoices();
  return voices.find(voice => voice.lang.toLowerCase() === "en-us")
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith("en"));
}

function TurnList({ turns }: { turns: V2View["turns"] }) {
  return <ul className={styles.turns}>{turns.map(turn => <li className={styles.turn} key={turn.id}>
    <div className={styles.turnHead}>
      <span className={styles.badge}>{turn.kind === "intro" ? "Introduction" : "Question"}</span>
      {turn.band && <span className={styles.band} data-band={turn.band}>{turn.band === "strong" ? "Strong" : turn.band === "partial" ? "Partial" : "Missed"}</span>}
    </div>
    <p className={styles.prompt}>{turn.prompt}</p>
    {turn.skipped ? <p className={styles.skipped}>Skipped</p> : <p className={styles.answer}>{turn.studentText}</p>}
    {turn.comment && <p className={styles.metaLine}>{turn.comment}</p>}
    {turn.sampleAnswer && <p className={styles.sample}>{turn.kind === "intro" ? "Suggested intro strategy:" : "Suggested answer:"} {turn.sampleAnswer}</p>}
  </li>)}</ul>;
}

function newerView(current: V2View, incoming: V2View) {
  if (incoming.session.id !== current.session.id) return incoming;
  return incoming.session.revision >= current.session.revision ? incoming : current;
}

export function InterviewV2Room({ initial }: { initial: V2View }) {
  const [view, setView] = useState(initial);
  useEffect(() => {
    setView(current => newerView(current, initial));
  }, [initial]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<V2Code | null>(null);
  const [muted, setMuted] = useState(false);
  const cancelDictation = useRef<(() => void) | null>(null);
  const feedbackRef = useRef<HTMLElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAlive = useRef<ReturnType<typeof setInterval> | null>(null);
  const micOn = useRef(false);
  const [hearing, setHearing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const professor = view.session.interviewer === "professor";
  const [interviewerLook, setInterviewerLook] = useState<Look>(professor ? "female" : "male");
  const [intervieweeLook, setIntervieweeLook] = useState<Look>("male");
  const words = wordCount(draft);
  const interviewerAlt = professor ? "Cartoon professor" : "Cartoon senior interviewer";
  const asking = view.canAnswer && view.session.state === "asking";
  const intro = view.canAnswer && view.session.state === "intro";
  const complete = view.session.state === "complete";
  const cap = sessionQuestionCap || 7;
  const shown = Math.min(cap, view.session.presented);
  const progress = Math.min(100, Math.round((shown / cap) * 100));
  const wordTone = words > 130 ? "over" : words >= 110 ? "near" : "ok";

  function stopSpeech() {
    if (speakTimer.current) window.clearTimeout(speakTimer.current);
    speakTimer.current = null;
    if (keepAlive.current) window.clearInterval(keepAlive.current);
    keepAlive.current = null;
    utteranceRef.current = null;
    const synth = window.speechSynthesis;
    // Pause, do not cancel. Chrome drops the microphone if cancel() was the last speech call.
    if (synth && (synth.speaking || synth.pending) && !synth.paused) synth.pause();
  }
  function speakText(text: string) {
    const synth = window.speechSynthesis;
    if (!text || !synth || typeof synth.speak !== "function" || micOn.current) return;
    if (speakTimer.current) window.clearTimeout(speakTimer.current);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = professor ? 0.9 : 1;
    utterance.volume = 1;
    const voice = englishVoice(synth);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (keepAlive.current) window.clearInterval(keepAlive.current);
      keepAlive.current = window.setInterval(() => {
        if (micOn.current || !synth.speaking) {
          if (keepAlive.current) window.clearInterval(keepAlive.current);
          keepAlive.current = null;
          return;
        }
        synth.resume();
      }, 4000);
    };
    utteranceRef.current = utterance;
    const start = () => {
      if (utteranceRef.current !== utterance || micOn.current) return;
      try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
      } catch { /* The Speak button stays available if the browser blocks audio. */ }
    };
    if (synth.speaking || synth.pending || synth.paused) {
      synth.cancel();
      speakTimer.current = setTimeout(start, 80);
    } else {
      start();
    }
  }
  useEffect(() => {
    if (!hearing) { setElapsed(0); return; }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 250);
    return () => window.clearInterval(timer);
  }, [hearing]);
  useEffect(() => {
    try { setVoiceOn(sessionStorage.getItem("forge-v2-voice") !== "0"); }
    catch { setVoiceOn(true); }
    const savedInterviewer = storedLook("forge-v2-interviewer-look");
    const savedInterviewee = storedLook("forge-v2-interviewee-look");
    setInterviewerLook(savedInterviewer ?? (professor ? "female" : "male"));
    setIntervieweeLook(savedInterviewee ?? "male");
  }, [professor]);
  function chooseLook(who: "interviewer" | "interviewee", look: Look) {
    if (who === "interviewer") setInterviewerLook(look);
    else setIntervieweeLook(look);
    try { sessionStorage.setItem(who === "interviewer" ? "forge-v2-interviewer-look" : "forge-v2-interviewee-look", look); }
    catch { /* The scene still changes for this visit. */ }
  }
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    const prime = () => { synth.getVoices(); };
    synth.addEventListener?.("voiceschanged", prime);
    return () => {
      synth.removeEventListener?.("voiceschanged", prime);
      cancelDictation.current?.();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    if (complete) {
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      feedbackRef.current?.scrollIntoView({ behavior: motion, block: "start" });
    }
  }, [complete]);
  useEffect(() => {
    if (muted || micOn.current || !view.bubble) {
      stopSpeech();
      return;
    }
    const timer = window.setTimeout(() => speakText(view.bubble ?? ""), 60);
    return () => {
      window.clearTimeout(timer);
      stopSpeech();
    };
  }, [view.bubble, view.session.revision, muted, professor]);
  async function run(action: () => Promise<{ code: V2Code; view?: V2View }>) {
    cancelDictation.current?.();
    stopSpeech();
    setBusy(true);
    try {
      const result = await action();
      setNotice(result.code === "ok" ? null : result.code);
      if (result.view) {
        const incoming = result.view;
        setView(current => newerView(current, incoming));
        setDraft("");
      }
    } catch { setNotice("unavailable"); }
    finally { setBusy(false); }
  }
  const interviewerBox = artSize.interviewer[interviewerLook];
  const intervieweeBox = artSize.interviewee[intervieweeLook];
  return <div className={styles.root}>
    <p className={styles.back}><Link href="/interviews-v2">Back to simulator v2</Link></p>
    <header className={styles.roomHead}>
      <div>
        <h2>{view.session.label}</h2>
      </div>
      <fieldset className={styles.cast}>
        <legend>Appearance</legend>
        <div className={styles.castRow}>
          <span>Interviewer</span>
          <label><input type="radio" name="v2-interviewer-look" value="male" checked={interviewerLook === "male"} onChange={() => chooseLook("interviewer", "male")} /> Male</label>
          <label><input type="radio" name="v2-interviewer-look" value="female" checked={interviewerLook === "female"} onChange={() => chooseLook("interviewer", "female")} /> Female</label>
        </div>
        <div className={styles.castRow}>
          <span>You</span>
          <label><input type="radio" name="v2-interviewee-look" value="male" checked={intervieweeLook === "male"} onChange={() => chooseLook("interviewee", "male")} /> Male</label>
          <label><input type="radio" name="v2-interviewee-look" value="female" checked={intervieweeLook === "female"} onChange={() => chooseLook("interviewee", "female")} /> Female</label>
        </div>
      </fieldset>
      {view.session.state !== "intro" && <div>
        <p className={styles.progressLabel}>{shown} / {cap}</p>
        <div className={styles.track} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      </div>}
    </header>
    <section className={styles.scene} aria-label="Interview room">
      <img className={styles.office} data-layer="office" src={roomArt.office} alt="" width={1280} height={720} />
      <img className={styles.interviewer} data-layer="interviewer" src={roomArt.interviewer[interviewerLook]} alt={interviewerAlt} width={interviewerBox[0]} height={interviewerBox[1]} />
      <img className={styles.table} data-layer="table" src={roomArt.table} alt="" width={1014} height={523} />
      <img className={styles.interviewee} data-layer="interviewee" src={roomArt.interviewee[intervieweeLook]} alt="" width={intervieweeBox[0]} height={intervieweeBox[1]} />
      <div className={styles.bubbleWrap} data-layer="question">
        <div className={styles.bubbleCard} data-related={view.followUp ? "true" : "false"} tabIndex={0} role="region" aria-label={asking ? "Interview question" : intro ? "Introduction prompt" : "Interviewer"}>
          {view.bubble ? <p className={styles.bubble}>{view.bubble}</p> : <p className={styles.bubbleMuted}>{complete ? "This interview has ended." : "The interviewer will speak in a moment."}</p>}
          {view.bubble && <button type="button" className={styles.speaker} aria-label="Speak" disabled={muted || hearing} onClick={() => speakText(view.bubble ?? "")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h3.2L12 5.2v13.6L7.2 15H4z" /><path d="M15.2 8.5a4.5 4.5 0 0 1 0 7M17.6 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>}
        </div>
      </div>
    </section>
    {notice && <p className={`${styles.notice} ${styles.progressNote}`} role="status">{v2Notices[notice]}</p>}
    {(intro || asking) && <InterviewV2Dictation draft={draft} allowed={voiceOn} cancelRef={cancelDictation} insert={setDraft} onMic={listening => { micOn.current = listening; setHearing(listening); if (listening) stopSpeech(); }}>
      {speech => <div className={styles.composer}>
        <form id="v2-desk" className={styles.desk} onSubmit={event => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          void run(() => intro ? submitIntro({ id: view.session.id, revision: view.session.revision, text }) : submitAnswer({ id: view.session.id, revision: view.session.revision, text }));
        }}>
          <div className={styles.answerMain}>
            <div className={styles.answerLabel}>
              <label htmlFor="v2-answer">{intro ? "Your introduction" : "Your answer"}</label>
              {intro && <span className={styles.count} id="intro-word-count" data-tone={wordTone}>{words}/130</span>}
            </div>
            <textarea id="v2-answer" value={draft} disabled={busy} maxLength={4000} onChange={event => setDraft(event.target.value)} placeholder={intro ? "Type your introduction" : "Type your answer, or use the microphone"} />
            {speech.status && <p className={styles.micNote} role="status">{speech.status}</p>}
          </div>
          <div className={styles.toolCol}>
            <button type="button" className={styles.mute} aria-pressed={muted} onClick={() => setMuted(value => !value)}>{muted ? "Unmute interviewer" : "Mute interviewer"}</button>
            <button className="primary-button" disabled={busy || !draft.trim()}>Send answer</button>
            {intro && <button type="button" className={styles.skip} disabled={busy} onClick={() => void run(() => skipIntro({ id: view.session.id, revision: view.session.revision }))}>Skip introduction</button>}
            {asking && <button type="button" className={styles.change} disabled={busy} onClick={() => void run(() => changeQuestion({ id: view.session.id, revision: view.session.revision }))}>Change question</button>}
            <button className={styles.end} type="button" disabled={busy} onClick={() => void run(() => endSession({ id: view.session.id, revision: view.session.revision }))}>End interview</button>
            <button type="button" className={speech.active ? styles.recording : styles.mic} aria-pressed={speech.active} aria-label={speech.active ? "Stop" : undefined} disabled={!speech.active && !speech.canRecord} onClick={speech.active ? speech.stop : speech.start}>
              {speech.active ? <>Stop <span className={styles.timer} aria-hidden="true">{clock(elapsed)}</span></> : <>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" /><path d="M6 11a6 6 0 0 0 12 0M12 17v3M8.5 20.5h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                Record
              </>}
            </button>
          </div>
        </form>
      </div>}
    </InterviewV2Dictation>}
    {complete && <section ref={feedbackRef} className={styles.summary} aria-label="Interview feedback">
      <h3>Session feedback</h3>
      <p>{view.ratingState === "ready" ? view.summary : view.ratingState === "empty" ? v2Notices.empty : v2Notices.unrated}</p>
      <TurnList turns={view.turns} />
    </section>}
  </div>;
}
