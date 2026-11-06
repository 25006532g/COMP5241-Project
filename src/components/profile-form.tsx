"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { updateProfile, type ProfileState } from "@/app/profile/actions";
import { SubmitButton } from "./submit-button";

type ProfileValues = { displayName: string; email: string; age?: number | string | null; ageRange?: string; level: string; subjects: string; goals: string; avatar: string | null; initials: string; setupRevision: number };

export function ProfileForm({ initial, notice }: { initial: ProfileValues; notice: { message: string; isError: boolean } | null }) {
  const [state, setState] = useState<ProfileState>({});
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (formRef.current) formRef.current.dataset.profileReady = "true"; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!state.error) {
      if (!submitted && notice) errorRef.current?.focus();
      return;
    }
    const invalid = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[aria-invalid="true"]');
    (invalid ?? errorRef.current)?.focus();
  }, [state, notice, submitted]);
  const fields = state.fields ?? initial;
  const errors = state.fieldErrors ?? {};

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    // Invoke explicitly so React does not reset File/removal inputs after a
    // failed action. Keep the File itself, not just its object-URL preview.
    if (selectedFile && data.get("removeAvatar") !== "on") data.set("avatar", selectedFile);
    inFlight.current = true; setPending(true); setSubmitted(true);
    try { setState(await updateProfile(state, data)); }
    catch {
      setState({
        error: "Could not confirm that your profile was saved. Reload your saved profile and compare before retrying.",
        fields: Object.fromEntries(["displayName", "age", "level", "subjects", "goals"].map(key => [key, String(data.get(key) ?? "")])) as ProfileState["fields"],
      });
    } finally { inFlight.current = false; setPending(false); }
  }

  return <form ref={formRef} onSubmit={submit} className="settings-panel" aria-busy={pending}>
    <input type="hidden" name="setupRevision" value={initial.setupRevision} />
    {(state.error || (!submitted && notice)) && <div ref={errorRef} tabIndex={-1} role="status" className={`form-notice ${state.error || notice?.isError ? "notice-error" : "notice-success"}`}>{state.error ?? notice?.message}</div>}
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <div className="profile-photo-row">
      <span className="large-avatar">{preview && !removeAvatar ? <Image src={preview} alt="Selected profile picture preview" width={70} height={70} unoptimized /> : !removeAvatar && initial.avatar?.startsWith("data:image/jpeg;base64,") ? <Image src={initial.avatar} alt="Your profile" width={70} height={70} unoptimized /> : initial.initials}</span>
      <div>
        <strong>Profile picture</strong>
        <p>Optional. JPG or PNG, up to 2 MB.</p>
        <label>Choose image<input ref={fileInput} type="file" name="avatar" accept="image/jpeg,image/png" onChange={event => { const file = event.target.files?.[0]; setSelectedFile(file ?? null); setPreview(file && ["image/jpeg", "image/png"].includes(file.type) && file.size <= 2 * 1024 * 1024 ? URL.createObjectURL(file) : null); setRemoveAvatar(false); }} /></label>
        {selectedFile && <small>Selected image retained for retry: {selectedFile.name}</small>}
        {initial.avatar && <label><input type="checkbox" name="removeAvatar" checked={removeAvatar} onChange={event => { setRemoveAvatar(event.target.checked); if (event.target.checked) { setSelectedFile(null); if (fileInput.current) fileInput.current.value = ""; setPreview(null); } }} /> Remove picture</label>}
        {(selectedFile || removeAvatar) && <button type="button" className="text-link" onClick={() => { if (fileInput.current) fileInput.current.value = ""; setSelectedFile(null); setPreview(null); setRemoveAvatar(false); fileInput.current?.focus(); }}>Cancel picture change</button>}
      </div>
    </div>
    <div className="settings-fields">
      <label>Display name<input key={state.fields?.displayName ?? "initial"} name="displayName" defaultValue={fields.displayName} minLength={2} maxLength={100} required aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? "profile-name-error" : undefined} />{errors.displayName && <small id="profile-name-error" className="field-error">{errors.displayName}</small>}</label>
      <label>Email address<input value={initial.email} readOnly aria-describedby="email-help" /><small id="email-help">Email changes require verification.</small></label>
      <label>Age<input key={state.fields?.age ?? "initial"} name="age" type="number" min={13} max={120} step={1} required defaultValue={fields.age ?? ""} aria-invalid={Boolean(errors.age)} aria-describedby={errors.age ? "profile-age-error profile-age-policy" : "profile-age-policy"} />{errors.age && <small id="profile-age-error" className="field-error">{errors.age}</small>}<small id="profile-age-policy">Supervised Hong Kong demo, ages 13+. External AI requires administrator-approved access, regardless of profile age or missing age. Changing your age does not grant AI access.</small>{(initial.ageRange === "under-13" || (typeof initial.age === "number" && initial.age < 13)) && <small className="field-error">This account needs administrator review. Account export and deletion remain available.</small>}</label>
      <label>Learning level<select key={state.fields?.level ?? "initial"} name="level" defaultValue={fields.level} required><option value="">Choose a level</option><option value="new">New to the subject</option><option value="foundation">Foundation</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
      <label className="full-field">Preferred subjects<input key={state.fields?.subjects ?? "initial"} name="subjects" defaultValue={fields.subjects} maxLength={300} aria-invalid={Boolean(errors.subjects)} aria-describedby={errors.subjects ? "profile-subjects-error" : undefined} /><small>Separate subjects with commas.</small>{errors.subjects && <small id="profile-subjects-error" className="field-error">{errors.subjects}</small>}</label>
      <label className="full-field">Learning goals<textarea key={state.fields?.goals ?? "initial"} name="goals" defaultValue={fields.goals} maxLength={800} aria-invalid={Boolean(errors.goals)} aria-describedby={errors.goals ? "profile-goals-error" : undefined} />{errors.goals && <small id="profile-goals-error" className="field-error">{errors.goals}</small>}</label>
    </div>
    <SubmitButton className="auth-submit save-profile" disabled={pending}>Save profile</SubmitButton>
    </fieldset>
  </form>;
}