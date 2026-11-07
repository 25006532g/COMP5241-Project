"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { askCoach } from "@/app/learning/actions";

export function LessonCoach({ id }: { id: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false), notice = useRef<HTMLParagraphElement>(null);
  // Refocus after each failed attempt, even when its error text is unchanged.
  useEffect(() => { if (!pending && error) notice.current?.focus(); }, [error, pending]);
  function submit() {
    if (inFlight.current || !question.trim()) return;
    inFlight.current = true;
    const conversation = [...messages.slice(-10), { role: "user" as const, content: question.trim() }];
    startTransition(async () => {
      setError("");
      try {
        const result = await askCoach(id, conversation);
        if (result.error) setError(result.error);
        else if (result.reply) { setMessages([...conversation, { role: "assistant", content: result.reply }]); setQuestion(""); }
        else setError("No coach reply was confirmed. Your question is retained. Try again when ready.");
      } catch {
        setError("Connection lost. Your question and conversation are retained. Check your connection, then choose Ask coach to retry. The previous request may already have been processed; no automatic retry was made.");
      } finally { inFlight.current = false; }
    });
  }
  return <section className="learning-section lesson-coach"><h2><MessageCircle size={22} /> Learning coach</h2><p className="privacy-note">AI responses can be wrong. Do not share personal information. This conversation is not saved to your account and disappears when you leave this page.</p><div aria-live="polite" aria-busy={pending}>{messages.map((message, index) => <div key={index} className="coach-message"><strong>{message.role === "user" ? "You" : "Coach"}</strong><p>{message.content}</p></div>)}</div><form className="learning-form" onSubmit={event => { event.preventDefault(); submit(); }}><label>Ask about this lesson<textarea value={question} maxLength={1200} required disabled={pending} onChange={event => setQuestion(event.target.value)} /></label><div className="player-navigation"><button className="auth-submit" disabled={pending || !question.trim()}><Send size={17} />{pending ? "Thinking..." : "Ask coach"}</button><button className="secondary-button" type="button" disabled={pending || !messages.length} onClick={() => { setMessages([]); setError(""); }}><Trash2 size={17} />Clear conversation</button></div></form>{error && <p ref={notice} tabIndex={-1} role="alert" className="form-notice notice-error">{error}</p>}</section>;
}