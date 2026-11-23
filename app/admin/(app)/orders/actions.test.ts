import { randomUUID } from "node:crypto"
import type { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { afterAll, beforeAll, expect, test, vi } from "vitest"
import { serve } from "@/e2e/db"

const PORT = 55900 + Math.floor(Math.random() * 90)
let signedIn = true

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-real-ip": "10.1.0.1" })),
  cookies: () => Promise.resolve({ set: () => undefined, get: () => undefined }),
}))
vi.mock("next/cache", () => ({ updateTag: () => undefined, refresh: () => undefined }))
vi.mock("next/server", () => ({ after: () => undefined }))
vi.mock("@/lib/auth", () => ({
  requireRole: () => (signedIn ? Promise.resolve({ user: { id: "e2e-owner" } }) : Promise.reject(new Error("NEXT_REDIRECT"))),
}))

let server: PGLiteSocketServer
let actions: typeof import("./actions")
let place: (lines: { id: number; qty: number; unitPaise: number }[], payment?: "pay_at_store" | "upi_manual", delivery?: "pickup" | "ship") => Promise<number>
let sql: (q: string) => Promise<Record<string, unknown>[]>

beforeAll(async () => {
  server = await serve(PORT)
  vi.stubEnv("DATABASE_URL", `postgres://postgres@127.0.0.1:${String(PORT)}/postgres`)
  actions = await import("./actions")
  const { placeOrder } = await import("@/app/(store)/checkout/actions")
  const { db } = await import("@/lib/db")
  const { sql: raw } = await import("drizzle-orm")
  sql = async (q) => (await db.execute(raw.raw(q))).rows
  let n = 0
  place = async (lines, payment = "upi_manual", delivery = "pickup") => {
    const address = delivery === "ship" ? { line1: "12 Shanti Nagar", line2: "Marve Road", city: "Mumbai", pincode: "400064" } : { line1: "", line2: "", city: "", pincode: "" }
    const r = await placeOrder({ idempotencyKey: randomUUID(), name: "Ravi Kumar", phone: `97${String(30000000 + n++)}`, email: "", delivery, ...address, landmark: "", payment, note: "", whatsappUpdates: false, lines })
    if (!r.ok) throw new Error(JSON.stringify(r))
    return Number(r.number.slice(2))
  }
}, 60000)

afterAll(async () => {
  await (await import("@/lib/db")).db.$client.end()
  await server.stop()
})

const stock = async () => (await sql("select stock from product where id = 7"))[0]?.stock

test("confirming reserves stock and cancelling puts it back", async () => {
  const before = await stock()
  const id = await place([{ id: 7, qty: 3, unitPaise: 20000 }])
  expect(await stock()).toBe(before)
  expect(await actions.confirmOrder({ id, deliveryPaise: null })).toEqual({ ok: true })
  expect(await stock()).toBe(Number(before) - 3)
  expect(await actions.cancelOrder({ id, reason: "Customer changed mind" })).toEqual({ ok: true })
  expect(await stock()).toBe(before)
})

test("two orders for the last pieces: the second confirm is refused, nothing is oversold", async () => {
  const a = await place([{ id: 2, qty: 2, unitPaise: 288000 }])
  const b = await place([{ id: 2, qty: 2, unitPaise: 288000 }])
  expect(await actions.confirmOrder({ id: a, deliveryPaise: null })).toEqual({ ok: true })
  expect(await actions.confirmOrder({ id: b, deliveryPaise: null })).toMatchObject({ ok: false, message: expect.stringContaining("Not enough stock") as string })
  expect((await sql("select stock from product where id = 2"))[0]?.stock).toBe(0)
})

test("a pickup order cannot be packed or shipped, a courier order cannot be marked ready for pickup", async () => {
  const pickup = await place([{ id: 1, qty: 1, unitPaise: 110000 }], "pay_at_store")
  await actions.confirmOrder({ id: pickup, deliveryPaise: null })
  expect(await actions.moveStage({ id: pickup, from: "confirmed", to: "packed" })).toMatchObject({ ok: false, message: expect.stringContaining("picked up") as string })
  const courier = await place([{ id: 1, qty: 1, unitPaise: 110000 }], "upi_manual", "ship")
  await actions.confirmOrder({ id: courier, deliveryPaise: null })
  await actions.recordUpi({ id: courier, utr: "423456789012", amountPaise: 118000 })
  expect(await actions.moveStage({ id: courier, from: "confirmed", to: "ready_for_pickup" })).toMatchObject({ ok: false, message: expect.stringContaining("courier") as string })
})

test("a courier order above the bands waits for a delivery charge, which confirming adds to the total", async () => {
  const { placeOrder } = await import("@/app/(store)/checkout/actions")
  const r = await placeOrder({ idempotencyKey: randomUUID(), name: "Ravi Kumar", phone: "9700099999", email: "", delivery: "ship", line1: "12 Shanti Nagar", line2: "Marve Road", landmark: "", city: "Mumbai", pincode: "400064", payment: "upi_manual", note: "", whatsappUpdates: false, lines: [{ id: 1, qty: 4, unitPaise: 110000 }] })
  if (!r.ok) throw new Error(JSON.stringify(r))
  const id = Number(r.number.slice(2))
  expect(await actions.confirmOrder({ id, deliveryPaise: null })).toMatchObject({ ok: false, message: "Enter the delivery charge." })
  expect(await actions.confirmOrder({ id, deliveryPaise: 25000 })).toEqual({ ok: true })
  expect(await sql(`select stage, charges_paise, total_paise from orders where id = ${String(id)}`)).toEqual([{ stage: "confirmed", charges_paise: 25000, total_paise: 465000 }])
})

test("UPI is recorded only on a confirmed order, never above the total, and a reference is used once", async () => {
  const id = await place([{ id: 1, qty: 1, unitPaise: 110000 }])
  expect(await actions.recordUpi({ id, utr: "123456789012", amountPaise: 110000 })).toMatchObject({ ok: false, message: expect.stringContaining("Confirm") as string })
  expect(await actions.confirmOrder({ id, deliveryPaise: null })).toEqual({ ok: true })
  expect(await actions.moveStage({ id, from: "confirmed", to: "ready_for_pickup" })).toMatchObject({ ok: false, message: expect.stringContaining("UPI") as string })
  expect(await actions.recordUpi({ id, utr: "123456789012", amountPaise: 120000 })).toMatchObject({ ok: false, message: expect.stringContaining("more than") as string })
  expect(await actions.recordUpi({ id, utr: "12345", amountPaise: 110000 })).toMatchObject({ ok: false, message: expect.stringContaining("12 digits") as string })
  expect(await actions.recordUpi({ id, utr: "123456789012", amountPaise: 110000 })).toEqual({ ok: true })
  expect(await actions.moveStage({ id, from: "confirmed", to: "ready_for_pickup" })).toEqual({ ok: true })

  const other = await place([{ id: 1, qty: 1, unitPaise: 110000 }])
  await actions.confirmOrder({ id: other, deliveryPaise: null })
  expect(await actions.recordUpi({ id: other, utr: "123456789012", amountPaise: 110000 })).toEqual({ ok: false, message: "This UPI reference was already used." })
})

test("a cancelled order takes no payment", async () => {
  const id = await place([{ id: 1, qty: 1, unitPaise: 110000 }])
  await actions.cancelOrder({ id, reason: "No longer needed" })
  expect(await actions.recordUpi({ id, utr: "223456789012", amountPaise: 110000 })).toMatchObject({ ok: false })
})

test("shipping needs a packed order and leaves a shipment record; stage moves cannot skip it", async () => {
  const id = await place([{ id: 1, qty: 1, unitPaise: 110000 }], "upi_manual", "ship")
  await actions.confirmOrder({ id, deliveryPaise: null })
  await actions.recordUpi({ id, utr: "323456789012", amountPaise: 118000 })
  expect(await actions.moveStage({ id, from: "confirmed", to: "shipped" })).toMatchObject({ ok: false })
  expect(await actions.markShipped({ id, courier: "DTDC", awb: "D1234567", trackingUrl: "" })).toMatchObject({ ok: false, message: expect.stringContaining("packed") as string })
  expect(await actions.moveStage({ id, from: "confirmed", to: "packed" })).toEqual({ ok: true })
  expect(await actions.markShipped({ id, courier: "DTDC", awb: "D1234567", trackingUrl: "" })).toEqual({ ok: true })
  expect(await sql(`select courier, awb from shipment where order_id = ${String(id)}`)).toEqual([{ courier: "DTDC", awb: "D1234567" }])
})

test("pay at the shop is marked paid when picked up", async () => {
  const id = await place([{ id: 1, qty: 1, unitPaise: 110000 }], "pay_at_store")
  await actions.confirmOrder({ id, deliveryPaise: null })
  await actions.moveStage({ id, from: "confirmed", to: "ready_for_pickup" })
  expect(await actions.moveStage({ id, from: "ready_for_pickup", to: "picked_up" })).toEqual({ ok: true })
  expect(await sql(`select payment, stage from orders where id = ${String(id)}`)).toEqual([{ payment: "paid", stage: "picked_up" }])
})

test("signed-out calls are rejected before anything is read or written", async () => {
  const id = await place([{ id: 1, qty: 1, unitPaise: 110000 }])
  signedIn = false
  try {
    await expect(actions.confirmOrder({ id, deliveryPaise: null })).rejects.toThrow("NEXT_REDIRECT")
    await expect(actions.cancelOrder("garbage")).rejects.toThrow("NEXT_REDIRECT")
  } finally {
    signedIn = true
  }
  expect(await sql(`select stage from orders where id = ${String(id)}`)).toEqual([{ stage: "requested" }])
})
