import { describe, expect, test } from "vitest"
import { authMethodFor, enrolmentExpired, roles, rolesOf } from "./auth"

describe("authMethodFor", () => {
  test("only the passkey verification endpoint yields a passkey session", () => {
    expect(authMethodFor("/passkey/verify-authentication")).toBe("passkey")
  })

  test("email OTP sign-in yields an otp session", () => {
    expect(authMethodFor("/sign-in/email-otp")).toBe("otp")
  })

  test("any other session-creating path is unknown and therefore denied", () => {
    for (const path of ["/sign-in/passkey", "/passkey/authenticate", "/sign-in/social", "/admin/impersonate-user", undefined]) {
      expect(authMethodFor(path)).toBe("unknown")
    }
  })
})

describe("enrolmentExpired", () => {
  const createdAt = new Date("2026-11-22T10:00:00Z")
  const at = (minutes: number) => createdAt.getTime() + minutes * 60_000

  test("an OTP session can enrol for 15 minutes from creation, whatever its refreshed expiry", () => {
    expect(enrolmentExpired({ authMethod: "otp", createdAt }, at(14))).toBe(false)
    expect(enrolmentExpired({ authMethod: "otp", createdAt }, at(15))).toBe(true)
    expect(enrolmentExpired({ authMethod: "unknown", createdAt }, at(16))).toBe(true)
  })

  test("passkey sessions never hit the enrolment window", () => {
    expect(enrolmentExpired({ authMethod: "passkey", createdAt }, at(60 * 24))).toBe(false)
  })
})

describe("roles", () => {
  test("splits Better Auth's comma-separated role field", () => {
    expect(rolesOf("owner, staff")).toEqual(["owner", "staff"])
    expect(rolesOf(null)).toEqual([])
  })

  test("staff and none cannot manage users or sessions, and nobody can impersonate", () => {
    expect(roles.staff.authorize({ user: ["set-role"] }).success).toBe(false)
    expect(roles.staff.authorize({ user: ["ban"] }).success).toBe(false)
    expect(roles.none.authorize({ session: ["list"] }).success).toBe(false)
    expect(roles.owner.authorize({ user: ["set-role"] }).success).toBe(true)
    expect(roles.owner.authorize({ user: ["impersonate"] }).success).toBe(false)
  })
})
