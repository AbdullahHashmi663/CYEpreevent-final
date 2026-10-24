import type { SiteSettings } from "./cms-types";

export function whatsappNumber(value: string): string | null {
  if (!value.trim() || value.length > 50 || !/^[+\d\s()-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
export function whatsappContacts(settings: Pick<SiteSettings, "whatsapp_contacts" | "contact_phone">) {
  // Preserve the previous contact until the admin explicitly configures this list.
  const contacts = settings.whatsapp_contacts ?? (settings.contact_phone ? [{ name: "", phone: settings.contact_phone }] : []);
  return contacts.filter(contact => whatsappNumber(contact.phone)).slice(0, 2);
}
