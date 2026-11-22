import { describe, expect, test } from "vitest"
import { clock, storeStatus, type Hours } from "./time"

const daily: Hours[] = Array.from({ length: 7 }, () => ({ opens: "09:00", closes: "22:00" }))
const ist = (iso: string) => new Date(`${iso}+05:30`)

describe("storeStatus", () => {
  test("open with time to spare", () => {
    expect(storeStatus(ist("2026-11-23T12:00:00"), daily, [])).toEqual({ tone: "open", text: "Open now, closes 10 pm" })
  })

  test("closing within 30 minutes", () => {
    expect(storeStatus(ist("2026-11-23T21:40:00"), daily, [])).toEqual({ tone: "closing", text: "Closes soon, at 10 pm" })
  })

  test("before opening and after closing", () => {
    expect(storeStatus(ist("2026-11-23T07:00:00"), daily, []).text).toBe("Closed, opens 9 am")
    expect(storeStatus(ist("2026-11-23T22:30:00"), daily, []).text).toBe("Closed, opens 9 am tomorrow")
  })

  test("index 0 is Monday, and a closed day skips ahead", () => {
    const mondayOff: Hours[] = [null, ...daily.slice(1)]
    expect(storeStatus(ist("2026-11-23T12:00:00"), mondayOff, []).text).toBe("Closed today, opens 9 am tomorrow")
    const midweekOff: Hours[] = [daily[0] ?? null, null, null, ...daily.slice(3)]
    expect(storeStatus(ist("2026-11-23T23:00:00"), midweekOff, []).text).toBe("Closed, opens Thursday 9 am")
  })

  test("special day overrides and carries its note", () => {
    const special = [{ day: "2026-11-23", hours: { opens: "09:00", closes: "14:00" }, note: "Guru Nanak Jayanti" }]
    expect(storeStatus(ist("2026-11-23T15:00:00"), daily, special).text).toBe("Closed, opens 9 am tomorrow. Guru Nanak Jayanti")
  })

  test("uses India time whatever the device clock zone", () => {
    expect(storeStatus(new Date("2026-11-23T17:00:00Z"), daily, []).text).toBe("Closed, opens 9 am tomorrow")
  })
})

test("clock", () => {
  expect(clock("22:00")).toBe("10 pm")
  expect(clock("09:30")).toBe("9:30 am")
  expect(clock("12:00")).toBe("12 pm")
  expect(clock("00:00")).toBe("12 am")
})
