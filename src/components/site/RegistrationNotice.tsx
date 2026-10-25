import type { PublicContent } from "@/lib/cms-types";

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

