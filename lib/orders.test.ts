import { expect, test } from "vitest"
import { isMaharashtraPincode, next, orderId, orderMessage, orderNumber } from "./orders"

test("order numbers round-trip", () => {
  expect(orderNumber(10023)).toBe("WS10023")
  expect(orderId("WS10023")).toBe(10023)
  expect(orderId("ws10023")).toBe(10023)
  expect(orderId("WS1")).toBeNull()
  expect(orderId("10023")).toBeNull()
})

test("Maharashtra pincodes only", () => {
  expect(isMaharashtraPincode("400064")).toBe(true)
  expect(isMaharashtraPincode("445001")).toBe(true)
  expect(isMaharashtraPincode("560001")).toBe(false)
  expect(isMaharashtraPincode("40006")).toBe(false)
})

test("terminal stages go nowhere", () => {
  expect(next.cancelled).toEqual([])
  expect(next.requested).toContain("confirmed")
})

test("order message reads like the counter slip", () => {
  const text = orderMessage({
    number: "WS10023",
    lines: [
      { name: "LED bulb LB2 oval", code: "LB2 OVAL", qty: 2, unit: "pcs", unitPaise: 18000, tier: "retail", hasRetail: true },
      { name: "Dim switch", code: null, qty: 5, unit: "pcs", unitPaise: 2600, tier: "wholesale", hasRetail: true },
    ],
    itemsPaise: 49000,
    chargesPaise: 0,
    deliveryPending: true,
    name: "Ravi",
    delivery: "ship",
    pincode: "400097",
    link: "https://example.test/order/WS10023",
  })
  expect(text).toBe(
    "Order WS10023\n2 pcs LED bulb LB2 oval (LB2 OVAL), ₹180 / pc = ₹360\n5 pcs Dim switch, ₹26 / pc, wholesale = ₹130\nItems ₹490, delivery charge to be confirmed\nRavi, courier to 400097\nLink: https://example.test/order/WS10023",
  )
})
