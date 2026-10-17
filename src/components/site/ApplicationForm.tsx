"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle, Plus, X } from "lucide-react";
import type { ApplicationKind, ApplicationPayload, PublicContent, TeamParticipant } from "@/lib/cms-types";

export function registrationsAvailable(data: PublicContent) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  return data.settings.registration_open && (!data.settings.event_date || data.settings.event_date >= today);
}

export function RegistrationNotice({ data }: { data: PublicContent }) {
  if (registrationsAvailable(data)) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const past = Boolean(data.settings.event_date && data.settings.event_date < today);
  return (
    <div className="explore-notice">
      <span className="notice-dot" aria-hidden="true" />
      <p><strong>Registration is closed.</strong> {past ? `The listed event date (${data.settings.date_label || data.settings.event_date}) has passed. Check back for the next edition.` : "Applications will become available when the organizers open registration."} <a href="/contact">Contact the team ↗</a></p>
    </div>
  );
}

interface FormProps {
  data: PublicContent;
  mode: "registration" | "ambassador" | "contact";
  defaultKind?: "contest" | "conference";
  defaultEntry?: string;
}

export default function ApplicationForm({ data, mode, defaultKind = "contest", defaultEntry = "" }: FormProps) {
  const [kind, setKind] = useState<ApplicationKind>(mode === "registration" ? defaultKind : mode);
  const initialEntries = defaultKind === "conference" ? data.conferences : data.contests;
  const [entryId, setEntryId] = useState(initialEntries.some(entry => entry.id === defaultEntry) ? defaultEntry : "");
  const [memberCount, setMemberCount] = useState(Math.max(1, Math.min(20, initialEntries.find(entry => entry.id === defaultEntry)?.min_members || 1)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const entries = kind === "conference" ? data.conferences : data.contests;
  const selected = entries.find(entry => entry.id === entryId);
  const maxMembers = mode === "registration" && kind === "contest" && selected ? Math.max(1, Math.min(20, selected.max_members)) : 1;
  const minMembers = mode === "registration" && kind === "contest" && selected ? Math.max(1, Math.min(maxMembers, selected.min_members || 1)) : 1;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const entryEnded = Boolean(selected?.date && selected.date < today);
  const competitionPayment = mode === "registration" && kind === "contest";
  const feeMissing = competitionPayment && Boolean(selected) && !(selected!.fee > 0);
  const available = mode === "contact" || registrationsAvailable(data);
  const disabled = !data.databaseAvailable || !available;
  const heading = mode === "contact" ? "Tell us what’s on your mind." : mode === "ambassador" ? "Make your introduction." : "Make your next move.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || busy || feeMissing || (mode === "registration" && entryEnded)) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setError("");
    const fields = new FormData(form);
    const field = (name: string) => String(fields.get(name) || "").trim();
    const team: TeamParticipant[] = Array.from({ length: Math.min(memberCount, maxMembers) - 1 }, (_, index) => ({
      name: field(`member-${index}-name`), email: field(`member-${index}-email`), phone: field(`member-${index}-phone`), university: field(`member-${index}-university`),
    }));
    const payload: ApplicationPayload = {
      kind,
      name: field("name"),
      email: field("email"),
      phone: field("phone"),
      university: field("university"),
      message: mode === "contact" ? `[${field("subject")}] ${field("message")}` : field("message"),
      department: field("department"),
      semester: field("semester"),
      website: field("website"),
      ...(mode === "registration" ? { entry_id: entryId, team_members: team } : {}),
    };
    if (mode === "registration" && !selected) {
      setError("Choose a conference or contest before submitting.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (mode === "registration" && memberCount < minMembers) {
      setError(`This competition requires at least ${minMembers} participants, including the team lead.`);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    const emails = [payload.email.toLowerCase(), ...team.map(member => member.email.toLowerCase())];
    if (new Set(emails).size !== emails.length) {
      setError("Each participant needs their own email address. Please check your team roster.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      let requestBody: FormData | string = JSON.stringify(payload);
      if (competitionPayment) {
        const receipt = fields.get("receipt");
        if (!(receipt instanceof File) || !receipt.size) throw new Error("Upload your payment receipt before submitting.");
        if (receipt.size > 2097152) throw new Error("Payment receipts must be 2 MB or smaller.");
        const multipart = new FormData();
        multipart.set("payload", JSON.stringify({ ...payload, expected_fee: selected!.fee }));
        multipart.set("receipt", receipt);
        requestBody = multipart;
      }
      const response = await fetch("/api/applications", {
        method: "POST", headers: typeof requestBody === "string" ? { "Content-Type": "application/json" } : undefined, body: requestBody, signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Your submission could not be saved. Please try again.");
      if (!body.reference || body.status !== "pending") throw new Error("We couldn’t confirm your submission. Please contact the organizers before trying again.");
      setResult({ reference: body.reference, message: body.message || (mode === "contact" ? "Your message has been saved for the organizing team." : "Your application has been saved and is awaiting the organizing team’s review.") });
      form.reset();
      setMemberCount(minMembers);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (caught) {
      setError(caught instanceof Error && caught.name === "AbortError" ? "The connection timed out. Contact the organizers to check your submission before sending it again." : caught instanceof Error ? caught.message : "We couldn’t reach the application service. Please try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  return (
    <div className="application-panel">
      <div className="application-heading"><span className="eyebrow">{mode === "contact" ? "A direct line" : "Your details"}</span><h2>{heading}</h2><p className="muted">{mode === "contact" ? "Questions, collaborations, or a good idea. We’re listening." : "A few details are all it takes. The organizing team reviews every application."}</p></div>
      {!data.databaseAvailable && <div className="form-feedback form-feedback-warning" role="status">The application service is temporarily unavailable. Your details cannot be saved right now. {data.settings.contact_email && <a href={`mailto:${data.settings.contact_email}`}>Email the organizing team ↗</a>}</div>}
      {mode !== "contact" && <RegistrationNotice data={data} />}
      {mode === "registration" && registrationsAvailable(data) && entryEnded && <div className="form-feedback form-feedback-warning" role="status">The selected event date has passed, so applications for this experience are closed. Choose another published experience or contact the team.</div>}
      {result ? (
        <div className="submission-success" ref={resultRef} tabIndex={-1} role="status">
          <span className="success-icon"><Check aria-hidden="true" size={30} /></span>
          <span className="eyebrow">Received / awaiting review</span>
          <h3>{mode === "contact" ? "Message received." : "You’re on our list."}</h3>
          <p>{result.message}</p>
          <div className="submission-reference"><span>Your reference</span><strong>{result.reference}</strong></div>
          <p className="muted">Save this reference when contacting the team. {mode !== "contact" && "Submission does not confirm admission; approval is handled by the organizers."}</p>
          <button className="button button-outline" onClick={() => setResult(null)}>{mode === "contact" ? "Send another message" : "Submit another application"}<ArrowUpRight size={17} aria-hidden="true" /></button>
        </div>
      ) : (
        <form onSubmit={submit} className="application-form">
          {error && <div ref={errorRef} tabIndex={-1} role="alert" className="form-feedback form-feedback-error">{error}</div>}
          <fieldset disabled={disabled || busy}>
            <legend className="visually-hidden">{mode === "contact" ? "Contact details" : "Application details"}</legend>
            {mode === "registration" && <div className="form-block form-entry-block">
              <span className="eyebrow">01 / Choose your experience</span>
              <div className="form-grid">
                <label className="form-field"><span>Application type <span aria-hidden="true">*</span></span><select name="kind" value={kind} onChange={event => { setKind(event.target.value as ApplicationKind); setEntryId(""); setMemberCount(1); setError(""); }}><option value="contest">Competition</option><option value="conference">Conference</option></select></label>
                <label className="form-field"><span>{kind === "contest" ? "Competition" : "Conference"} <span aria-hidden="true">*</span></span><select name="entry_id" required value={entryId} onChange={event => { setEntryId(event.target.value); const entry = entries.find(item => item.id === event.target.value); setMemberCount(kind === "contest" ? Math.max(1, Math.min(20, entry?.min_members || 1)) : 1); setError(""); }}><option value="">Choose an experience</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
              </div>
              {selected && <div className="selected-entry-info"><span>{selected.fee > 0 ? `PKR ${selected.fee.toLocaleString()}${competitionPayment ? " per registration" : ""}` : competitionPayment ? "Fee to be announced — registration unavailable" : "No entry fee listed"}</span><span>{maxMembers === 1 ? "Individual entry" : minMembers === maxMembers ? `${maxMembers} participants, including you` : `${minMembers}–${maxMembers} participants, including you`}</span>{selected.time && <span>{selected.time}</span>}</div>}
              {competitionPayment && selected && <div className="form-block" style={{ marginTop: 24 }}>
                <span className="eyebrow">Payment & receipt</span>
                <p>{selected.fee > 0 ? `Pay PKR ${selected.fee.toLocaleString()} for this ${maxMembers > 1 ? "team" : "individual"} registration, then attach your receipt.` : "The organizers must set a price before you can register."}</p>
                {selected.payment_method && <p><strong>Pay with:</strong> {selected.payment_method}</p>}
                {selected.payment_account_name && <p><strong>Account holder:</strong> {selected.payment_account_name}</p>}
                {selected.payment_account_number && <p style={{ overflowWrap: "anywhere" }}><strong>Account / wallet number:</strong> {selected.payment_account_number}</p>}
                {selected.payment_instructions && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{selected.payment_instructions}</p>}
                {!selected.payment_instructions && !selected.payment_account_number && <p>Contact the organizers at <a href={`mailto:${data.settings.contact_email}`}>{data.settings.contact_email}</a> for payment account details before paying.</p>}
                <label className="form-field"><span>Payment receipt *</span><input key={entryId} name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required disabled={feeMissing} /><span>JPG, PNG, WebP or PDF · up to 2 MB. Only organizers can access your receipt. Payment is verified during application review.</span></label>
              </div>}
              {entries.length === 0 && <p className="muted">No {kind === "contest" ? "competitions" : "conferences"} are currently published. Please contact the organizers.</p>}
            </div>}
            <div className="form-block">
              <span className="eyebrow">{mode === "registration" ? "02 / Team lead or individual" : "01 / A little about you"}</span>
              <div className="form-grid">
                <label className="form-field"><span>Full name <span aria-hidden="true">*</span></span><input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Your full name" /></label>
                <label className="form-field"><span>Email address <span aria-hidden="true">*</span></span><input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
                <label className="form-field"><span>Phone number {mode !== "contact" && <span aria-hidden="true">*</span>}</span><input name="phone" type="tel" required={mode !== "contact"} minLength={7} maxLength={25} autoComplete="tel" placeholder="+92 300 1234567" /></label>
                {mode !== "contact" && <label className="form-field"><span>University / institution <span aria-hidden="true">*</span></span><input name="university" required maxLength={180} autoComplete="organization" placeholder="Where you study" /></label>}
                {mode === "ambassador" && <>
                  <label className="form-field"><span>Department <span aria-hidden="true">*</span></span><input name="department" required maxLength={120} placeholder="Your area of study" /></label>
                  <label className="form-field"><span>Semester / year <span aria-hidden="true">*</span></span><input name="semester" required maxLength={40} placeholder="e.g. Semester 5" /></label>
                </>}
                {mode === "contact" && <label className="form-field"><span>What’s it about? <span aria-hidden="true">*</span></span><select name="subject" required defaultValue="General inquiry"><option>General inquiry</option><option>Competitions & registrations</option><option>Conferences & speakers</option><option>Campus ambassadors</option><option>Sponsorship & partnerships</option><option>Accessibility & venue</option></select></label>}
              </div>
            </div>
            {mode === "registration" && maxMembers > 1 && <div className="form-block team-roster">
              <div className="roster-heading"><span className="eyebrow">03 / Your team</span><span>{memberCount} / {maxMembers} participants</span></div>
              <p className="muted">You’re already included as team lead. Add your remaining teammates below.</p>
              {Array.from({ length: Math.min(memberCount, maxMembers) - 1 }, (_, index) => <div key={`${entryId}-${index}`} className="roster-member">
                <div className="roster-member-heading"><strong>Participant {index + 2}</strong>{index === memberCount - 2 && memberCount > minMembers && <button type="button" className="remove-member" aria-label={`Remove participant ${index + 2}`} onClick={() => setMemberCount(count => count - 1)}><X size={18} aria-hidden="true" /> Remove</button>}</div>
                <div className="form-grid">
                  <label className="form-field"><span>Full name *</span><input name={`member-${index}-name`} required minLength={2} maxLength={120} placeholder="Teammate’s name" /></label>
                  <label className="form-field"><span>Email address *</span><input name={`member-${index}-email`} required type="email" maxLength={254} placeholder="Their own email address" /></label>
                  <label className="form-field"><span>Phone number *</span><input name={`member-${index}-phone`} required type="tel" minLength={7} maxLength={25} placeholder="+92 300 1234567" /></label>
                  <label className="form-field"><span>University / institution *</span><input name={`member-${index}-university`} required maxLength={180} placeholder="Where they study" /></label>
                </div>
              </div>)}
              {memberCount < maxMembers && <button type="button" className="button button-outline add-member" onClick={() => setMemberCount(count => count + 1)}><Plus size={17} aria-hidden="true" /> Add a teammate</button>}
            </div>}
            <div className="form-block">
              <label className="form-field"><span>{mode === "contact" ? "Your message *" : mode === "ambassador" ? "Why would you like to be a campus ambassador? *" : "Anything we should know? (optional)"}</span><textarea name="message" required={mode !== "registration"} minLength={mode === "registration" ? undefined : 10} maxLength={mode === "contact" ? 4800 : 5000} rows={5} placeholder={mode === "ambassador" ? "Tell us about yourself, your campus, and how you’d bring people together." : mode === "contact" ? "Give us a little context so we can help." : "Accessibility needs, questions, or a note for the organizers."} /></label>
            </div>
            <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <label className="consent-field"><input type="checkbox" name="consent" required /><span>I confirm these details are correct and agree that the organizing team may use them to process and respond to this {mode === "contact" ? "message" : "application"}.</span></label>
            <div className="form-submit-row"><button className="button button-primary" type="submit" disabled={disabled || busy || feeMissing || (mode === "registration" && (!entries.length || entryEnded))}>{busy ? <><LoaderCircle size={18} className="form-spinner" aria-hidden="true" /> Saving your details…</> : <>{mode === "contact" ? "Send your message" : "Submit application"}<ArrowUpRight size={19} aria-hidden="true" /></>}</button><span className="muted">{disabled || entryEnded ? "Submissions are currently unavailable." : mode === "contact" ? "Saved directly for the organizing team." : "Subject to organizer approval."}</span></div>
          </fieldset>
        </form>
      )}
    </div>
  );
}

