import "server-only"
import { env } from "./env"

type Email = { to: string; subject: string; text: string }

export async function sendEmail(email: Email) {
  if (env.AUTH_OTP_SINK === "console") {
    console.info(`[email sink] to=${email.to} subject=${email.subject}\n${email.text}`)
    return
  }
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM")
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text }),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}`)
}
