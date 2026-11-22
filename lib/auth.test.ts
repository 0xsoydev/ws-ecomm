import { describe, expect, test } from "vitest"
import { authMethodFor, isAllowedMethod, roles, rolesOf } from "./auth"

describe("authMethodFor", () => {
  test("passkey verification yields a passkey session", () => {
    expect(authMethodFor("/passkey/verify-authentication")).toBe("passkey")
  })

  test("without email, password sign-in is a password session; changing a password never creates one", () => {
    expect(authMethodFor("/sign-in/email", false)).toBe("password")
    expect(authMethodFor("/change-password", false)).toBe("unknown")
  })

  test("with email codes on, only the verified code yields a password session, never the bare password step", () => {
    expect(authMethodFor("/sign-in/email", true)).toBe("unknown")
    expect(authMethodFor("/two-factor/verify-otp", true)).toBe("password")
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
