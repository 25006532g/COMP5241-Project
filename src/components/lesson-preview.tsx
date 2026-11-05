"use client";

import { useRef, type ReactNode } from "react";
import { Eye, X } from "lucide-react";
import type { LessonContent } from "@/lib/learning";
import { LessonMetadata } from "./lesson-metadata";

// Deliberately not Markdown/HTML or general linkification. A rejected token is
// kept whole: never search inside it for a second, apparently safe scheme.
function httpsReference(value: string): boolean {
  if (!/^https:\/\//iu.test(value) || /[\s\p{Cc}\p{Cf}<>"`\\]/u.test(value)) return false;
  const authority = value.slice(8).split(/[/?#]/u)[0];
  if (!authority || authority.includes("@") || authority.includes("%") || authority.endsWith(":")) return false;
  try {
    // Validate complete UTF-8 sequences, not individual continuation octets.
    // Decoding is validation-only: href and visible/stored text stay literal.
    if (/[\p{Cc}\p{Cf}]/u.test(decodeURIComponent(value))) return false;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
    // URL validates bracketed IPv6. For DNS/IP names reject shorthand IPs,
    // empty/underscore labels and single-label names; no DNS lookup is made.
    if (url.hostname.startsWith("[")) return true;
    const host = authority.replace(/:\d+$/u, "");
    if (/^\d+(?:\.\d+)*$/u.test(host)) {
      return /^(?:\d{1,3}\.){3}\d{1,3}$/u.test(host) && host === url.hostname;
    }
    return url.hostname.length <= 253 && url.hostname.includes(".") &&
      url.hostname.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu.test(label)) &&
      /[a-z]/iu.test(url.hostname.split(".").at(-1) ?? "");
  } catch { return false; }
}

export function LessonText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let end = 0;
  // Markup-looking input remains entirely literal, including attribute URLs.
  // React escapes all strings; this is not a sanitizer or a trust assessment.
  if (!/<\/?[a-z][^>]*>/iu.test(text)) for (const match of text.matchAll(/[^ \r\n]+/gu)) {
    const token = match[0];
    const leading = token.match(/^[([{]*/u)?.[0].length ?? 0;
    let value = token.slice(leading);
    for (;;) {
      const previous = value;
      // A colon can be a port delimiter: never repair an empty/malformed port.
      value = value.replace(/[.,;!?]+$/u, "");
      for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
        if (value.endsWith(close) && value.split(close).length > value.split(open).length) value = value.slice(0, -1);
      }
      if (value === previous) break;
    }
    // Do not turn the prefix of a whitespace-split authority/path into a link.
    const continuation = /^[ \r\n]+(?:[@/\\]|\.[\p{L}\p{N}])/u.test(text.slice(match.index + token.length));
    if (!httpsReference(value) || continuation) continue;
    const start = match.index + leading;
    parts.push(text.slice(end, start), <a key={start} href={value} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
      title="External link, opens in a new tab. Reference not verified."
      aria-label={`${value} (external link, opens in a new tab; reference not verified)`}>{value}</a>);
    end = start + value.length;
  }
  parts.push(text.slice(end));
  return <span className="lesson-text">{parts}</span>;
}

export function LessonPreview({ content }: { content: LessonContent }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  return <>
    <button ref={trigger} type="button" className="secondary-button" onClick={() => dialog.current?.showModal()}><Eye size={17} />Preview lesson</button>
    <dialog ref={dialog} className="lesson-preview" aria-label="Learner-facing lesson preview" onClose={() => trigger.current?.focus()}>
      <header><span className="eyebrow">LESSON PREVIEW</span><button type="button" className="icon-button" aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={18} /></button></header>
      <h2>{content.title || "Untitled lesson"}</h2><p>{content.summary}</p>
      <LessonMetadata subject={content.subject} metadata={content.metadata} />
      {content.slides.map((slide, index) => <section key={index} style={{ background: slide.style?.background, color: slide.style?.color, textAlign: slide.style?.align }}><span className="eyebrow">SLIDE {index + 1}</span><h3 style={{ color: slide.style?.color, fontSize: slide.style?.size }}>{slide.title}</h3><p style={{ color: slide.style?.color, fontSize: slide.style ? Math.max(16, slide.style.size - 6) : undefined }}><LessonText text={slide.body} /></p>{content.template !== "slides" && <blockquote><LessonText text={slide.example} /></blockquote>}</section>)}
      {content.template !== "slides" && <section><span className="eyebrow">PRACTICE</span><h3>{content.activity.prompt}</h3><ol>{content.activity.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>}
      {content.questions.length > 0 && <section><span className="eyebrow">FINAL QUIZ</span>{content.questions.map((question, index) => <div key={index}><h3>{index + 1}. {question.prompt}</h3><ol type="A">{question.options.map((option, optionIndex) => <li key={optionIndex}>{option}</li>)}</ol></div>)}</section>}
    </dialog>
  </>;
}