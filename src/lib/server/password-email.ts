import "server-only";
import { fail } from "./http";

export function passwordEmailConfiguration() {
  const recipient = process.env.ADMIN_SECURITY_EMAIL?.trim();
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !key || !from) {
    fail(503, "Password verification email is not configured. Contact the website owner.");
  }
  return { recipient, key, from };
}

export async function sendPasswordCode(code: string, challengeId: string) {
  const { recipient, key, from } = passwordEmailConfiguration();
  let delivered = false;
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `password-code-${challengeId}` },
      body: JSON.stringify({ from, to: [recipient], subject: "CYE admin password verification code", text: `Your Capital Youth Expo admin password verification code is: ${code}\n\nThis code expires in 10 minutes and can be used once. Enter it in the admin portal to confirm the password change. If you did not request this, do not share this code.` }),
      signal: AbortSignal.timeout(10000),
    });
    delivered = result.ok;
  } catch { /* Provider diagnostics must never expose a code or API key. */ }
  if (!delivered) fail(503, "The verification email could not be sent. Please try again shortly.");
  const [name, domain] = recipient.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
