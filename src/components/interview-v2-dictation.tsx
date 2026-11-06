"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

let owner: object | null = null;

export type V2Speech = {
  status: string;
  active: boolean;
  canRecord: boolean;
  canInsert: boolean;
  start: () => void;
  stop: () => void;
  insertText: () => void;
};

export function InterviewV2Dictation({ draft, insert, cancelRef, onMic, onPreview, allowed = true, children }: {
  draft: string; insert: (text: string) => void; cancelRef: { current: (() => void) | null };
  onMic?: (listening: boolean) => void;
  onPreview?: (text: string) => void;
  allowed?: boolean;
  children: (speech: V2Speech) => ReactNode;
}) {
  const { browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition({ transcribing: false });
  const [preview, setPreview] = useState("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Typing is always available.");
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);
  const cancel = useRef<() => void>(() => {});
  const previewSink = useRef(onPreview);
  previewSink.current = onPreview;
  function publish(text: string) {
    setPreview(text);
    previewSink.current?.(text);
  }
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (!allowed) cancel.current();
  }, [allowed]);
  useEffect(() => {
    mounted.current = true;
    const stop = () => cancel.current();
    cancelRef.current = stop;
    return () => { mounted.current = false; stop(); cancelRef.current = null; };
  }, [cancelRef]);

  async function start() {
    if (!allowed || owner || active || !browserSupportsSpeechRecognition || !isMicrophoneAvailable) {
      setMessage(allowed ? "Dictation is unavailable. Type instead." : "Voice recording is off. Tick it on the start page, or type instead.");
      return;
    }
    const recognition = SpeechRecognition.getRecognition();
    if (!recognition) return;
    const ticket = {};
    owner = ticket;
    let accepting = true;
    let stoppedByUser = false;
    let recovering = false;
    let retries = 1;
    setActive(true); publish(""); setMessage("Listening. Speak your whole answer, then press Stop. Nothing is sent yet.");
    // Stay inside this click. Opening the mic ourselves, or cancelling the interviewer, makes Chrome abort dictation at once.
    onMic?.(true);
    const result = (event: SpeechRecognitionEvent) => {
      if (!accepting || !mounted.current || owner !== ticket) return;
      publish(Array.from(event.results, item => item[0].transcript.trim()).filter(Boolean).join(" "));
    };
    const finish = (note: string) => {
      accepting = false;
      stoppedByUser = true;
      recognition.removeEventListener("result", result);
      recognition.removeEventListener("end", end);
      recognition.removeEventListener("error", onError);
      if (owner === ticket) owner = null;
      onMic?.(false);
      if (mounted.current) {
        setActive(false);
        setMessage(note);
      }
    };
    const end = () => {
      if (accepting && !stoppedByUser) return;
      if (owner === ticket) owner = null;
      onMic?.(false);
      if (mounted.current) setActive(false);
    };
    const noteFor = (code: string) => code === "not-allowed" || code === "service-not-allowed"
      ? "Microphone permission was denied. Allow the microphone for this site, then press Mic again."
      : code === "network"
        ? "The browser could not reach its speech service. Check your connection, or type instead."
        : code === "audio-capture"
          ? "The microphone is in use or blocked. Allow microphone access, then press Mic again."
          : "Dictation stopped. Type instead.";
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
      if (!accepting || !mounted.current || owner !== ticket) return;
      try { await listen(); } catch { finish("Could not start the microphone. Allow microphone access, or type instead."); }
    };
    const onError = (event: SpeechRecognitionErrorEvent) => {
      if (!accepting || stoppedByUser || owner !== ticket || recovering) return;
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
    cancel.current = () => {
      if (owner !== ticket && owner !== null) return;
      finish("Stopped. Press Insert to put the preview in your answer, or type instead.");
      void SpeechRecognition.abortListening();
    };
    recognition.addEventListener("result", result);
    recognition.addEventListener("end", end);
    recognition.addEventListener("error", onError);
    try {
      await listen();
    } catch {
      finish("Could not start the microphone. Allow microphone access, or type instead.");
    }
  }
  const combined = [draft, preview.trim()].filter(Boolean).join(draft.trim() ? " " : "");
  const blocked = !ready
    ? "Typing is always available."
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
    canInsert: !!preview.trim(),
    start: () => void start(),
    stop: () => cancel.current(),
    insertText: () => {
      cancel.current();
      insert(combined);
      publish("");
      setMessage("Inserted into the answer. Review it before sending.");
    },
  });
}
