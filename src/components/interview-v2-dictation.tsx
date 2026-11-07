"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const speechLock: { ticket: object | null; cancel: () => void } = { ticket: null, cancel: () => {} };
let dictationMounted = false;

function stopDictation() {
  speechLock.cancel();
}
function micTaken() {
  return speechLock.ticket !== null;
}
function claimTicket(ticket: object) {
  speechLock.ticket = ticket;
}
function releaseTicket(ticket: object) {
  if (speechLock.ticket === ticket) speechLock.ticket = null;
}
function ticketHeld(ticket: object) {
  return speechLock.ticket === ticket;
}
function armCancel(cancel: () => void) {
  speechLock.cancel = cancel;
}
function pageMounted() {
  return dictationMounted;
}
function bindPage(cancelRef: { current: (() => void) | null }) {
  dictationMounted = true;
  const stop = () => speechLock.cancel();
  cancelRef.current = stop;
  return () => {
    dictationMounted = false;
    stop();
    cancelRef.current = null;
  };
}

export type V2Speech = {
  status: string;
  active: boolean;
  canRecord: boolean;
  canInsert: boolean;
  start: () => void;
  stop: () => void;
  insertText: () => void;
};

function noteFor(code: string) {
  if (code === "not-allowed" || code === "service-not-allowed") return "Microphone permission was denied. Allow the microphone for this site, then press Mic again.";
  if (code === "network") return "The browser could not reach its speech service. Check your connection, or type instead.";
  if (code === "audio-capture") return "The microphone is in use or blocked. Allow microphone access, then press Mic again.";
  return "Dictation stopped. Type instead.";
}

async function runDictation(input: {
  draft: string;
  insert: (text: string) => void;
  onMic?: (listening: boolean) => void;
  publish: (text: string) => void;
  setActive: (active: boolean) => void;
  setMessage: (message: string) => void;
}) {
  const recognition = SpeechRecognition.getRecognition();
  if (!recognition) return;
  const ticket = {};
  claimTicket(ticket);
  let accepting = true;
  let stoppedByUser = false;
  let recovering = false;
  let retries = 1;
  const base = input.draft;
  input.setActive(true);
  input.publish("");
  input.setMessage("Listening. Words are added to the answer. Nothing is sent yet.");
  // Stay inside this click. Opening the mic ourselves, or cancelling the interviewer, makes Chrome abort dictation at once.
  input.onMic?.(true);
  const writeSpoken = (spoken: string) => {
    const trimmed = base.trim();
    input.insert(spoken ? (trimmed ? `${trimmed} ${spoken}` : spoken) : base);
  };
  const result = (event: SpeechRecognitionEvent) => {
    if (!accepting || !pageMounted() || !ticketHeld(ticket)) return;
    const spoken = Array.from(event.results, item => item[0].transcript.trim()).filter(Boolean).join(" ");
    input.publish(spoken);
    writeSpoken(spoken);
  };
  const finish = (note: string) => {
    accepting = false;
    stoppedByUser = true;
    recognition.removeEventListener("result", result);
    recognition.removeEventListener("end", end);
    recognition.removeEventListener("error", onError);
    releaseTicket(ticket);
    input.onMic?.(false);
    if (pageMounted()) {
      input.setActive(false);
      input.setMessage(note);
    }
  };
  const end = () => {
    if (accepting && !stoppedByUser) return;
    releaseTicket(ticket);
    input.onMic?.(false);
    if (pageMounted()) input.setActive(false);
  };
  const listen = () => SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  const recover = async () => {
    const synth = window.speechSynthesis;
    if (synth) {
      await new Promise<void>(resolve => {
        let settled = false;
        const done = () => { if (!settled) { settled = true; resolve(); } };
        const blip = new SpeechSynthesisUtterance(" ");
        blip.volume = 0;
        blip.onend = done;
        blip.onerror = done;
        try { synth.resume(); synth.cancel(); synth.speak(blip); } catch { done(); }
        window.setTimeout(done, 300);
      });
    }
    if (!accepting || !pageMounted() || !ticketHeld(ticket)) return;
    try { await listen(); } catch { finish("Could not start the microphone. Allow microphone access, or type instead."); }
  };
  const onError = (event: SpeechRecognitionErrorEvent) => {
    if (!accepting || stoppedByUser || !ticketHeld(ticket) || recovering) return;
    const code = event.error;
    if (code === "no-speech" || code === "aborted") return;
    if ((code === "network" || code === "audio-capture") && retries > 0) {
      retries -= 1;
      recovering = true;
      recognition.continuous = false;
      void recover().finally(() => { recovering = false; });
      return;
    }
    recognition.continuous = false;
    finish(noteFor(code));
    void SpeechRecognition.abortListening();
  };
  armCancel(() => {
    if (!ticketHeld(ticket) && micTaken()) return;
    finish("Recording stopped. Review the answer before sending.");
    void SpeechRecognition.abortListening();
  });
  recognition.addEventListener("result", result);
  recognition.addEventListener("end", end);
  recognition.addEventListener("error", onError);
  try {
    await listen();
  } catch {
    finish("Could not start the microphone. Allow microphone access, or type instead.");
  }
}

export function InterviewV2Dictation({ draft, insert, cancelRef, onMic, onPreview, allowed = true, children }: {
  draft: string; insert: (text: string) => void; cancelRef: { current: (() => void) | null };
  onMic?: (listening: boolean) => void;
  onPreview?: (text: string) => void;
  allowed?: boolean;
  children: (speech: V2Speech) => ReactNode;
}) {
  const { browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition({ transcribing: false });
  const [, setPreview] = useState("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  useEffect(() => bindPage(cancelRef), [cancelRef]);
  useEffect(() => {
    if (!allowed) stopDictation();
  }, [allowed]);

  function start() {
    if (!allowed || micTaken() || active || !browserSupportsSpeechRecognition || !isMicrophoneAvailable) {
      setMessage(allowed ? "Dictation is unavailable. Type instead." : "Voice recording is off. Tick it on the start page, or type instead.");
      return;
    }
    void runDictation({
      draft,
      insert,
      onMic,
      publish: text => { setPreview(text); onPreview?.(text); },
      setActive,
      setMessage,
    });
  }
  const blocked = !ready
    ? ""
    : !browserSupportsSpeechRecognition
      ? "Speech recognition is unavailable in this browser. Type instead."
      : !allowed
        ? "Voice recording is off. Tick it on the start page, or type instead."
        : !isMicrophoneAvailable
          ? "The microphone is unavailable. Type instead."
          : null;
  return children({
    status: blocked ?? message,
    active,
    canRecord: ready && allowed && browserSupportsSpeechRecognition && isMicrophoneAvailable && !active,
    canInsert: false,
    start,
    stop: stopDictation,
    insertText: () => {},
  });
}
