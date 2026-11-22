import "server-only"
import { passkey } from "@better-auth/passkey"
import { betterAuth, type GenericEndpointContext } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { admin, emailOTP } from "better-auth/plugins"
import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import * as authSchema from "./auth-schema"
import { db, schema } from "./db"
import { env } from "./env"
import { sendEmail } from "./notify"
import { authEvents } from "./schema"

export type AuthMethod = "passkey" | "otp" | "unknown"

export function authMethodFor(path: string | undefined): AuthMethod {
  if (path === "/passkey/verify-authentication") return "passkey"
  if (path === "/sign-in/email-otp") return "otp"
  return "unknown"
}

export const OTP_SESSION_MS = 15 * 60 * 1000

export function enrolmentExpired(session: { authMethod: string; createdAt: Date }, now = Date.now()) {
  return session.authMethod !== "passkey" && session.createdAt.getTime() + OTP_SESSION_MS <= now
}

const ac = createAccessControl(defaultStatements)
export const roles = {
  owner: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
  }),
  staff: ac.newRole({ user: [], session: [] }),
  none: ac.newRole({ user: [], session: [] }),
}

const baseURL = env.VERCEL_ENV === "preview" && env.VERCEL_BRANCH_URL ? `https://${env.VERCEL_BRANCH_URL}` : env.BETTER_AUTH_URL
const origin = new URL(baseURL).origin

function normalise(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

async function hasPasskey(email: string) {
  const rows = await db
    .select({ id: authSchema.passkey.id })
    .from(authSchema.user)
    .innerJoin(authSchema.passkey, eq(authSchema.passkey.userId, authSchema.user.id))
    .where(eq(authSchema.user.email, email))
    .limit(1)
  return rows.length > 0
}

function requestMeta(ctx: GenericEndpointContext | null) {
  const headers = ctx?.headers
  return {
    ip: headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headers?.get("user-agent") ?? null,
  }
}

async function logAuth(kind: (typeof authEvents.$inferInsert)["kind"], ctx: GenericEndpointContext | null, who: { userId?: string | null; email?: string | null }) {
  await db.insert(authEvents).values({ kind, userId: who.userId ?? null, email: who.email ?? null, ...requestMeta(ctx) })
}

export const auth = betterAuth({
  appName: "WS Green admin",
  baseURL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [origin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: false },
  rateLimit: { enabled: true, storage: "database", modelName: "auth_rate_limit" },
  session: {
    additionalFields: {
      authMethod: { type: "string", required: true, defaultValue: "unknown", input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: (session, ctx) => Promise.resolve({ data: { ...session, authMethod: authMethodFor(ctx?.path) } }),
        after: async (session, ctx) => {
          await logAuth(session.authMethod === "passkey" ? "passkey_sign_in" : "sign_in", ctx, { userId: session.userId })
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email-otp") {
        const body: unknown = ctx.body
        const email = normalise(body && typeof body === "object" && "email" in body ? body.email : undefined)
        if (email && (await hasPasskey(email))) {
          throw APIError.from("BAD_REQUEST", { code: "INVALID_OTP", message: "Invalid OTP" })
        }
      }
      if (ctx.path === "/passkey/generate-register-options" || ctx.path === "/passkey/verify-registration") {
        const current = await getSessionFromCtx(ctx)
        if (!current) return
        const stored: unknown = current.session.authMethod
        const authMethod = typeof stored === "string" ? stored : "unknown"
        const viaOtp = authMethod !== "passkey"
        if (viaOtp && (enrolmentExpired({ authMethod, createdAt: current.session.createdAt }) || (await hasPasskey(current.user.email)))) {
          throw APIError.from("FORBIDDEN", { code: "ENROLMENT_CLOSED", message: "Sign in again to set up a passkey" })
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const returned: unknown = ctx.context.returned
      const failed = returned instanceof APIError
      const body: unknown = ctx.body
      const email = normalise(body && typeof body === "object" && "email" in body ? body.email : undefined) || null
      if (ctx.path === "/sign-in/email-otp" && failed) await logAuth("otp_failed", ctx, { email })
      if (ctx.path === "/sign-out") await logAuth("sign_out", ctx, { userId: ctx.context.session?.user.id ?? null })
      if (!failed && body && typeof body === "object" && "userId" in body && typeof body.userId === "string") {
        if (ctx.path === "/admin/ban-user") await logAuth("banned", ctx, { userId: body.userId })
        if (ctx.path === "/admin/set-role") await logAuth("role_changed", ctx, { userId: body.userId })
      }
    }),
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }, ctx) {
        const normalised = normalise(email)
        if (type !== "sign-in" || (await hasPasskey(normalised))) return
        await logAuth("otp_sent", ctx ?? null, { email: normalised })
        await sendEmail({
          to: normalised,
          subject: `${otp} is your WS Green admin code`,
          text: `Your code is ${otp}. It works once, for 5 minutes, and only to set up a passkey on this device.\n\nIf you did not ask for it, ignore this email.`,
        })
      },
    }),
    passkey({ rpID: new URL(origin).hostname, rpName: "WS Green admin", origin }),
    admin({ ac, roles, defaultRole: "none", adminRoles: ["owner"] }),
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
export type Role = keyof typeof roles

export function rolesOf(role: string | null | undefined) {
  return (role ?? "").split(",").map((r) => r.trim()).filter(Boolean)
}

export async function getAdminSession() {
  const current = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } })
  return current && !enrolmentExpired(current.session) ? current : null
}

export async function requireRole(...allowed: Role[]) {
  const current = await getAdminSession()
  if (!current) redirect("/admin/sign-in")
  if (current.session.authMethod !== "passkey") redirect("/admin/enrol")
  const userRoles = rolesOf(current.user.role)
  if (!allowed.some((r) => userRoles.includes(r))) redirect("/admin/sign-in?error=no-access")
  return current
}
