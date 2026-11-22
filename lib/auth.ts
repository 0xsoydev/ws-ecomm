import "server-only"
import { passkey } from "@better-auth/passkey"
import { betterAuth, type GenericEndpointContext } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { admin, twoFactor } from "better-auth/plugins"
import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { user } from "./auth-schema"
import { db, schema } from "./db"
import { emailConfigured, sendEmail } from "./email"
import { env } from "./env"
import { authEvents } from "./schema"

export type AuthMethod = "passkey" | "password" | "unknown"

export function authMethodFor(path: string | undefined, emailCodes = emailConfigured): AuthMethod {
  if (path === "/passkey/verify-authentication") return "passkey"
  if (path === "/two-factor/verify-otp") return "password"
  if (path === "/sign-in/email") return emailCodes ? "unknown" : "password"
  return "unknown"
}

export const isAllowedMethod = (method: unknown) => method === "passkey" || method === "password"

export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

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
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: false,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    revokeSessionsOnPasswordReset: true,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "auth_rate_limit",
    customRules: { "/two-factor/send-otp": { window: 60, max: 3 }, "/two-factor/verify-otp": { window: 60, max: 6 } },
  },
  user: {
    additionalFields: {
      mustChangePassword: { type: "boolean", required: true, defaultValue: false, input: false },
    },
  },
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
      if (ctx.path === "/sign-in/email") {
        const body: unknown = ctx.body
        const email = body && typeof body === "object" && "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
        if (email) await db.update(user).set({ twoFactorEnabled: emailConfigured }).where(eq(user.email, email))
      }
      if (ctx.path === "/passkey/generate-register-options" || ctx.path === "/passkey/verify-registration") {
        const current = await getSessionFromCtx(ctx)
        if (current && !isAllowedMethod(current.session.authMethod)) {
          throw APIError.from("FORBIDDEN", { code: "SIGN_IN_AGAIN", message: "Sign in again to set up a passkey" })
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const returned: unknown = ctx.context.returned
      const failed = returned instanceof APIError
      const body: unknown = ctx.body
      const email = body && typeof body === "object" && "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : null
      if (ctx.path === "/sign-in/email" && failed) await logAuth("password_failed", ctx, { email })
      if (ctx.path === "/two-factor/verify-otp" && failed) await logAuth("otp_failed", ctx, { email: null })
      if (ctx.path === "/change-password" && !failed) await logAuth("password_changed", ctx, { userId: ctx.context.session?.user.id ?? null })
      if (ctx.path === "/sign-out") await logAuth("sign_out", ctx, { userId: ctx.context.session?.user.id ?? null })
      if (!failed && body && typeof body === "object" && "userId" in body && typeof body.userId === "string") {
        if (ctx.path === "/admin/ban-user") await logAuth("banned", ctx, { userId: body.userId })
        if (ctx.path === "/admin/set-role") await logAuth("role_changed", ctx, { userId: body.userId })
      }
    }),
  },
  plugins: [
    twoFactor({
      issuer: "WS Green admin",
      otpOptions: {
        period: 5,
        digits: 6,
        allowedAttempts: 3,
        storeOTP: "hashed",
        async sendOTP({ user: who, otp }, ctx) {
          await logAuth("otp_sent", ctx ?? null, { userId: who.id, email: who.email })
          await sendEmail({
            to: who.email,
            subject: `${otp} is your WS Green admin code`,
            text: `Your sign-in code is ${otp}. It works once, for 5 minutes.\n\nIf you did not just sign in with your password, someone else has it: change your password.`,
          })
        },
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
  return current && isAllowedMethod(current.session.authMethod) ? current : null
}

export async function requireSession() {
  const current = await getAdminSession()
  if (!current) redirect("/admin/sign-in")
  return current
}

export async function requireRole(...allowed: Role[]) {
  const current = await requireSession()
  if (current.user.mustChangePassword) redirect("/admin/password")
  const userRoles = rolesOf(current.user.role)
  if (!allowed.some((r) => userRoles.includes(r))) redirect("/admin/sign-in?error=no-access")
  return current
}
