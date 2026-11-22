import { describe, expect, test } from "vitest"
import { authMethodFor, isAllowedMethod, roles, rolesOf } from "./auth"

describe("authMethodFor", () => {
  test("passkey verification yields a passkey session", () => {
    expect(authMethodFor("/passkey/verify-authentication")).toBe("passkey")
  })

  test("email and password sign-in, and the session re-issued by a password change, are password sessions", () => {
    expect(authMethodFor("/sign-in/email")).toBe("password")
    expect(authMethodFor("/change-password")).toBe("password")
  })

  test("any other session-creating path is unknown and denied, email codes included", () => {
    for (const path of ["/sign-in/email-otp", "/sign-in/passkey", "/sign-in/social", "/admin/impersonate-user", "/sign-up/email", undefined]) {
      expect(authMethodFor(path)).toBe("unknown")
      expect(isAllowedMethod(authMethodFor(path))).toBe(false)
    }
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
