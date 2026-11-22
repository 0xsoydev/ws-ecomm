import "server-only"
import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  AUTH_OTP_SINK: z.enum(["off", "console"]).default("off"),
  PHONE_PEPPER: z.string().min(32),
  SITE_INDEXABLE: z.stringbool().default(false),
  CHECKOUT_MODE: z.enum(["whatsapp", "full"]).default("whatsapp"),
  SHIPROCKET_MODE: z.enum(["off", "manual", "live"]).default("off"),
})

const parsed = schema.parse(process.env)

if (parsed.VERCEL_ENV === "production" && parsed.AUTH_OTP_SINK !== "off") {
  throw new Error("AUTH_OTP_SINK must be off in production")
}

export const env = parsed
