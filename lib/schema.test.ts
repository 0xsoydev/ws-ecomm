import { describe, expect, test } from "vitest"
import { settingsSchema } from "./schema"

describe("settingsSchema", () => {
  test("an empty or old settings row parses with every default", () => {
    const parsed = settingsSchema.parse({})
    expect(parsed.legalName).toBe("Gulab Auto Garage")
    expect(parsed.weeklyHours).toHaveLength(7)
    expect(parsed.launchFloors).toEqual({ purchasablePct: 70, ownPhotoPct: 60 })
  })

  test("a UPI ID without an @handle is rejected", () => {
    expect(settingsSchema.safeParse({ upiVpa: "9821784847" }).success).toBe(false)
    expect(settingsSchema.safeParse({ upiVpa: "gulabauto@okaxis" }).success).toBe(true)
  })
})
