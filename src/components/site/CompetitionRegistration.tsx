"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { PARTNER_LEVELS, type PartnerCatalogue, type PartnerCompetition } from "@/lib/partner-competitions";

export default function CompetitionRegistration({ competition, catalogue }: { competition: PartnerCompetition; catalogue: PartnerCatalogue }) {
  const [count, setCount] = useState(competition.teamMin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState<{id: number; status: string; paymentStatus: string} | null>(null);
  const inFlight = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || result || uncertain || !catalogue.registrationOpen) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const file = fields.get("paymentSlip");
    if (!(file instanceof File) || !file.size || file.size > 4194304) { setError("Upload a payment slip image up to 4 MB."); return; }
    const text = (key: string) => String(fields.get(key) || "").trim();
    const registration = { competition: competition.name, teamName: text("teamName"), level: text("level"), idNumber: text("idNumber"), consent: fields.get("consent") === "on", members: Array.from({length: count}, (_, i) => ({ name: text(`name-${i}`), email: text(`email-${i}`), phone: text(`phone-${i}`), institution: text(`institution-${i}`), gender: text(`gender-${i}`) })) };
    const body = new FormData();
    body.set("entry_id", competition.localId); body.set("expected_fee", competition.fee); body.set("registration", JSON.stringify(registration)); body.set("paymentSlip", file);
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/competition-registrations", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) { setUncertain(Boolean(data.uncertain)); throw Error(data.error || "Registration could not be completed."); }
      setResult(data);
    } catch (e) {
      if (e instanceof TypeError || e instanceof SyntaxError) { setUncertain(true); setError("The response could not be confirmed. Check the team lead’s email and contact the organizers before submitting again to avoid a duplicate entry."); }
      else setError((e as Error).message);
    } finally { inFlight.current = false; setBusy(false); requestAnimationFrame(() => feedback.current?.focus()); }
  }
  return <div className="partner-registration-layout">
    <aside className="partner-registration-summary">
      <span className="eyebrow">CYE competition registration</span><h2>{competition.name}</h2>
      <p>{competition.description}</p>
      <dl><div><dt>Registration fee</dt><dd>{competition.fee} {competition.teamMax > 1 ? "per team" : "per person"}</dd></div><div><dt>Participants</dt><dd>{competition.teamMin === competition.teamMax ? competition.teamMin : `${competition.teamMin}–${competition.teamMax}`} per registration</dd></div><div><dt>Main CYE event</dt><dd>18 November 2026<br/>Pak-China Friendship Center, Islamabad</dd></div></dl>
      {competition.rulebookUrl && <a className="text-link" href={competition.rulebookUrl} target="_blank" rel="noopener noreferrer">Read the competition rulebook (PDF) ↗</a>}
      <p className="partner-scope-note">This entry is submitted to the main CYE organizing team for payment review and approval. Workshop and talk registrations use their own forms and payment details.</p>
      <Link href="/register?kind=conference" className="text-link">Workshop & talk registration ↗</Link>
      <h3>Other competitions</h3><nav aria-label="Competition registration forms" className="partner-form-links">{catalogue.competitions.map(c => <Link key={c.localId} href={`/competition-registration/${c.localId}`} aria-current={c.localId === competition.localId ? "page" : undefined}>{c.name}</Link>)}</nav>
    </aside>
    <div className="application-panel partner-application-panel">
      {result ? <div ref={feedback} tabIndex={-1} role="status" className="submission-success"><span className="eyebrow">Entry received by CYE</span><h2>You’re registered for review.</h2><p>Your CYE registration reference is <strong>#{result.id}</strong>. Save this number.</p><p>Status: <strong>{result.status}</strong><br/>Payment: <strong>{result.paymentStatus}</strong></p><p>The team lead will receive CYE’s confirmation email. Payment and entry approval are handled by the CYE organizing team. Do not submit this entry again.</p><Link className="button button-outline" href="/competitions">Back to competitions</Link></div> : <form className="application-form" onSubmit={submit}>
        <div className="application-heading"><span className="eyebrow">Your competition entry</span><h2>{competition.teamMax === 1 ? "Register yourself." : "Bring your team."}</h2><p>One fee covers one {competition.teamMax === 1 ? "individual" : "team"} entry. The first participant is the team lead.</p></div>
        {!catalogue.registrationOpen && <div className="form-feedback form-feedback-warning" role="status">CYE competition registration is currently closed.</div>}
        {error && <div ref={feedback} tabIndex={-1} className="form-feedback form-feedback-error" role="alert">{error}{uncertain && <p><Link href="/contact">Contact the organizers ↗</Link></p>}</div>}
        <fieldset disabled={busy || uncertain || !catalogue.registrationOpen}>
          <legend className="visually-hidden">{competition.name} registration</legend>
          <div className="form-block"><span className="eyebrow">01 / Entry details</span><div className="form-grid">
            <label className="form-field"><span>Team size *</span><select value={count} onChange={e => setCount(Number(e.target.value))}>{Array.from({length:competition.teamMax-competition.teamMin+1},(_,i)=>competition.teamMin+i).map(n=><option key={n} value={n}>{n} {n===1?"participant":"participants"}</option>)}</select></label>
            {count > 1 && <label className="form-field"><span>Team name *</span><input name="teamName" required maxLength={160}/></label>}
            <label className="form-field"><span>Current level / grade *</span><select name="level" required defaultValue=""><option value="" disabled>Select your level</option>{PARTNER_LEVELS.map(level=><option key={level}>{level}</option>)}</select></label>
            <label className="form-field"><span>Team lead’s CNIC / Student ID / B-Form *</span><input name="idNumber" required maxLength={80} autoComplete="off"/><small>Sent securely to CYE. It is not included in registration lookup responses.</small></label>
          </div></div>
          <div className="form-block"><span className="eyebrow">02 / Participants</span>{Array.from({length:count},(_,i)=><div className="partner-member" key={i}><h3>{i===0?"Team lead":`Participant ${i+1}`}</h3><div className="form-grid">
            <label className="form-field"><span>Full name *</span><input name={`name-${i}`} required maxLength={160} autoComplete={i===0?"name":"off"}/></label>
            <label className="form-field"><span>Email *</span><input name={`email-${i}`} type="email" required maxLength={254} autoComplete={i===0?"email":"off"}/>{i===0 && <small>CYE sends the confirmation to this address.</small>}</label>
            <label className="form-field"><span>Phone / WhatsApp *</span><input name={`phone-${i}`} type="tel" required maxLength={35} autoComplete={i===0?"tel":"off"}/></label>
            <label className="form-field"><span>University / school *</span><input name={`institution-${i}`} required maxLength={160} placeholder="Institution and campus"/></label>
            <label className="form-field"><span>Gender *</span><select name={`gender-${i}`} required defaultValue=""><option value="" disabled>Select gender</option><option>Male</option><option>Female</option></select></label>
          </div></div>)}</div>
          <div className="form-block partner-payment"><span className="eyebrow">03 / Competition payment</span><h3>Pay {competition.fee}</h3><p>Use one of the main CYE competition accounts below. These are separate from workshop payments. Include your team name or team lead’s name in the reference.</p>
            <div className="partner-wallet"><strong>JazzCash</strong><span>Account title: HASSAN AHMED</span><span>Account number: <b>03199649689</b></span><span>IBAN: <b>PK19JCMA0810923199649689</b></span></div>
            <div className="partner-wallet"><strong>SadaPay</strong><span>Account title: HASSAN AHMED</span><span>Account number: <b>03199649689</b></span></div>
            <label className="form-field"><span>Payment slip *</span><input type="file" name="paymentSlip" required accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"/><small>JPEG, PNG, WebP or HEIC · maximum 4 MB. Sent securely to CYE for review.</small></label>
          </div>
          <label className="partner-consent"><input type="checkbox" name="consent" required/><span>I confirm all participant details are accurate, have permission to submit their details, and accept the {competition.rulebookUrl ? <a href={competition.rulebookUrl} target="_blank" rel="noopener noreferrer">competition rules</a> : "competition rules"}. I understand that participant details, the team lead’s ID and payment slip will be sent to the CYE organizing team for registration and payment review.</span></label>
          <button className="button button-primary" type="submit" disabled={busy || uncertain || !catalogue.registrationOpen}>{busy?"Submitting to CYE…":"Submit competition registration"}</button>
        </fieldset>
      </form>}
    </div>
  </div>;
}
