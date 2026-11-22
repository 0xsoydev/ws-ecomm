import "server-only"
import { createTransport } from "nodemailer"
import { BUSINESS } from "./business"
import { env } from "./env"

export const emailConfigured = Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD)

const transport = emailConfigured
  ? createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    })
  : null

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (!transport || !env.GMAIL_USER) throw new Error("Email is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD")
  await transport.sendMail({ from: { name: `${BUSINESS.brand} (${BUSINESS.legalName})`, address: env.GMAIL_USER }, to, subject, text })
}
