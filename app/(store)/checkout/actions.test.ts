import { randomUUID } from "node:crypto"
import type { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { afterAll, beforeAll, expect, test, vi } from "vitest"
import { serve } from "@/e2e/db"
import type { CheckoutInput, CheckoutResult } from "./actions"

const PORT = 55500 + Math.floor(Math.random() * 400)
let ip = "10.0.0.1"

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-real-ip": ip })),
  cookies: () => Promise.resolve({ set: () => undefined, get: () => undefined }),
}))
vi.mock("next/cache", () => ({ updateTag: () => undefined }))
vi.mock("next/server", () => ({ after: () => undefined }))

let server: PGLiteSocketServer
let placeOrder: (raw: unknown) => Promise<CheckoutResult>
let sql: (q: string) => Promise<Record<string, unknown>[]>

beforeAll(async () => {
  server = await serve(PORT)
  vi.stubEnv("DATABASE_URL", `postgres://postgres@127.0.0.1:${String(PORT)}/postgres`)
  placeOrder = (await import("./actions")).placeOrder
  const { db } = await import("@/lib/db")
  const { sql: raw } = await import("drizzle-orm")
  sql = async (q) => (await db.execute(raw.raw(q))).rows
}, 60000)

afterAll(async () => {
  await (await import("@/lib/db")).db.$client.end()
  await server.stop()
})

let phoneSeq = 0
const order = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  idempotencyKey: randomUUID(),
  name: "Ravi Kumar",
  phone: `98${String(20000000 + phoneSeq++)}`,
  email: "",
  delivery: "pickup",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  pincode: "",
  payment: "pay_at_store",
  note: "",
  whatsappUpdates: false,
  lines: [{ id: 1, qty: 1, unitPaise: 110000 }],
  ...over,
})

const ok = (r: CheckoutResult) => {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`)
  return Number(r.number.slice(2))
}

test("a pickup order is saved with server prices and reserves tracked stock", async () => {
  const id = ok(await placeOrder(order({ lines: [{ id: 7, qty: 3, unitPaise: 20000 }] })))
  const [row] = await sql(`select stage, total_paise, method from orders where id = ${String(id)}`)
  expect(row).toMatchObject({ stage: "requested", total_paise: 60000, method: "pay_at_store" })
  const [lever] = await sql("select stock from product where id = 7")
  expect(lever?.stock).toBe(7)
})

test("the same request twice gives one order; a changed request is refused", async () => {
  const input = order()
  const first = await placeOrder(input)
  expect(await placeOrder(input)).toEqual(first)
  const again = await placeOrder({ ...input, note: "changed" })
  expect(again).toMatchObject({ ok: false, kind: "message" })
})

test("a stale price is refused with the current price", async () => {
  expect(await placeOrder(order({ lines: [{ id: 1, qty: 1, unitPaise: 100000 }] }))).toEqual({ ok: false, kind: "price", changed: [{ id: 1, unitPaise: 110000 }] })
})

test("more than the stock is refused", async () => {
  expect(await placeOrder(order({ lines: [{ id: 2, qty: 3, unitPaise: 288000 }] }))).toEqual({ ok: false, kind: "stock", ids: [2] })
})

test("below the part minimum and below the order minimum are refused", async () => {
  expect(await placeOrder(order({ lines: [{ id: 5, qty: 2, unitPaise: 6500 }] }))).toMatchObject({ ok: false, kind: "message", message: expect.stringContaining("quantity") as string })
  expect(await placeOrder(order({ lines: [{ id: 6, qty: 1, unitPaise: 15000 }] }))).toMatchObject({ ok: false, kind: "message", message: expect.stringContaining("minimum order") as string })
})

test("courier is refused for pickup-only parts and outside Maharashtra", async () => {
  const ship = { delivery: "ship" as const, payment: "upi_manual" as const, line1: "12 Shanti Nagar", city: "Mumbai", pincode: "400064" }
  expect(await placeOrder(order({ ...ship, lines: [{ id: 4, qty: 100, unitPaise: 9000 }] }))).toMatchObject({ ok: false, kind: "message", message: expect.stringContaining("picked up") as string })
  expect(await placeOrder(order({ ...ship, pincode: "560001" }))).toMatchObject({ ok: false, kind: "fields", fields: { pincode: expect.any(String) as string } })
})

test("courier charge comes from the bands, and above the last band the order waits for a quote", async () => {
  const ship = { delivery: "ship" as const, payment: "upi_manual" as const, line1: "12 Shanti Nagar", city: "Mumbai", pincode: "400064" }
  const small = ok(await placeOrder(order({ ...ship, lines: [{ id: 1, qty: 1, unitPaise: 110000 }] })))
  const big = ok(await placeOrder(order({ ...ship, lines: [{ id: 1, qty: 4, unitPaise: 110000 }] })))
  const rows = await sql(`select id, stage, charges_paise from orders where id in (${String(small)}, ${String(big)}) order by id`)
  expect(rows).toEqual([
    { id: small, stage: "requested", charges_paise: 8000 },
    { id: big, stage: "quote_pending", charges_paise: 0 },
  ])
})

test("ordering with someone's number does not rename them", async () => {
  const phone = "9876500001"
  ok(await placeOrder(order({ phone, name: "Asha Patil" })))
  ok(await placeOrder(order({ phone, name: "Someone Else" })))
  const [c] = await sql(`select first_name from customer where phone = '${phone}'`)
  expect(c?.first_name).toBe("Asha")
})

test("refused attempts do not use up the phone limit; placed orders do", async () => {
  const phone = "9876500002"
  ip = "10.0.0.2"
  for (let i = 0; i < 6; i++) expect((await placeOrder(order({ phone, lines: [{ id: 1, qty: 1, unitPaise: 1 }] }))).ok).toBe(false)
  for (let i = 0; i < 5; i++) ok(await placeOrder(order({ phone })))
  expect(await placeOrder(order({ phone }))).toMatchObject({ ok: false, kind: "message", message: expect.stringContaining("Too many") as string })
})
