"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import { SubmitButton } from "./submit-button";
import { logIn, requestReset, resendVerification, resetPassword, signUp, type CredentialState } from "@/app/auth/actions";

type Mode = "login" | "signup" | "forgot" | "reset";

export function AuthForm({ mode, error: rawError, success: rawSuccess, message: rawMessage, email: rawEmail, verification: rawVerification }: { mode: Mode; error?: string; success?: string; message?: string; email?: string; verification?: string }) {
  const [credentialState, credentialAction] = useActionState(mode === "signup" ? signUp : logIn, {} as CredentialState);
  const [recoveryState, recoveryAction] = useActionState(requestReset, {} as CredentialState);
  const error = typeof rawError === "string" ? rawError : undefined;
  const success = typeof rawSuccess === "string" ? rawSuccess : undefined;
  const message = typeof rawMessage === "string" ? rawMessage : undefined;
  const email = typeof rawEmail === "string" ? rawEmail : undefined;
  const verification = typeof rawVerification === "string" ? rawVerification : undefined;
  const content = {
    login: ["Welcome back.", "Continue where you left off.", "Log in"],
    signup: ["Make learning yours.", "Create a private learning profile in under a minute.", "Create account"],
    forgot: ["Reset your password.", "We’ll email a secure link if your account exists.", "Send reset link"],
    reset: ["Choose a new password.", "Use a strong password you do not reuse elsewhere.", "Update password"],
  }[mode];
  const state = mode === "forgot" ? recoveryState : credentialState;
  const notice = state.error ?? error ?? success ?? message;
  const fieldErrors = state.fieldErrors ?? {};
  const retainedEmail = state.fields?.email ?? email ?? "";
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.error && !error) return;
    const invalid = formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>('[aria-invalid="true"]');
    (invalid ?? noticeRef.current)?.focus();
  }, [state, error]);

  return <main className="auth-page">
    <section className="auth-aside">
      <Brand light />
      <div><span className="eyebrow">LEARN WITH AGENCY</span><h2>Build the judgment<br />behind the work.</h2><p>A little practice. A clearer understanding. Your next step starts here.</p></div>
      <ul><li><ShieldCheck size={17} /> Your private lessons stay private</li><li><LockKeyhole size={17} /> Passwords are securely managed</li></ul>
    </section>
    <section className="auth-main">
      <div className="auth-card">
        <Brand />
        <div className="auth-title"><h1>{content[0]}</h1><p>{content[1]}</p></div>
        {notice && <div ref={noticeRef} tabIndex={-1} role={state.error || error ? "alert" : "status"} className={`form-notice ${state.error || error ? "notice-error" : "notice-success"}`}>{success && !state.error && !error && <CheckCircle2 size={17} />}{notice}</div>}
        <form ref={formRef} action={mode === "login" || mode === "signup" ? credentialAction : mode === "forgot" ? recoveryAction : resetPassword} className="auth-fields">
          {mode === "signup" && <label>Display name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="How should we call you?" defaultValue={credentialState.fields?.name} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} />{fieldErrors.name && <span id="name-error" className="field-error">{fieldErrors.name}</span>}</label>}
          {mode !== "reset" && <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" defaultValue={retainedEmail} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} />{fieldErrors.email && <span id="email-error" className="field-error">{fieldErrors.email}</span>}</label>}
          {mode === "signup" && <label>Age<input key={credentialState.fields?.age ?? "initial"} name="age" type="number" min={13} max={120} step={1} required defaultValue={credentialState.fields?.age ?? ""} aria-invalid={Boolean(fieldErrors.age)} aria-describedby={fieldErrors.age ? "age-error age-policy" : "age-policy"} />{fieldErrors.age && <span id="age-error" className="field-error">{fieldErrors.age}</span>}</label>}
          {(mode === "login" || mode === "signup" || mode === "reset") && <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 8} placeholder={mode === "login" ? "Your password" : "8+ characters, uppercase and number"} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : undefined} />{fieldErrors.password && <span id="password-error" className="field-error">{fieldErrors.password}</span>}</label>}
          {mode === "signup" && <p id="age-policy" className="privacy-note">This supervised Hong Kong demo is for ages 13+. External AI requires administrator-approved access, regardless of profile age or missing age. Signing up does not grant AI access.</p>}
          {mode === "login" && <Link className="text-link forgot-link" href="/forgot-password">Forgot password?</Link>}
          <SubmitButton>{content[2]} <ArrowRight size={17} /></SubmitButton>
        </form>
        {mode === "login" && (verification === "required" || credentialState.verification || success?.startsWith("Account created")) && <form action={resendVerification} className="resend-form"><input type="hidden" name="email" value={retainedEmail} /><span>Didn’t receive the verification email?</span><SubmitButton className="text-link" disabled={!retainedEmail}>Resend verification</SubmitButton></form>}
        <p className="auth-swap">{mode === "login" ? <>New to Forge? <Link href="/signup">Create an account</Link></> : mode === "signup" ? <>Already learning? <Link href="/login">Log in</Link></> : <>Return to <Link href="/login">log in</Link></>}</p>
        <p className="privacy-note">We only collect what supports your learning. Never share an address, phone number, ID, financial details, or exact birth date.</p>
      </div>
    </section>
  </main>;
}