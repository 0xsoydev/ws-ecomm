import "server-only"
import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GMAIL_USER: z.email().optional(),
  GMAIL_APP_PASSWORD: z.string().min(1).optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().default(465),
  PHONE_PEPPER: z.string().min(32),
  SITE_INDEXABLE: z.stringbool().default(false),
  CHECKOUT_MODE: z.enum(["whatsapp", "full"]).default("whatsapp"),
  SHIPROCKET_MODE: z.enum(["off", "manual", "live"]).default("off"),
})

export const env = schema
  .refine((e) => Boolean(e.GMAIL_USER) === Boolean(e.GMAIL_APP_PASSWORD), { message: "Set both GMAIL_USER and GMAIL_APP_PASSWORD, or neither" })
  .parse(process.env)
