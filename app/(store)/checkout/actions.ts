"use server"

import { createHash, createHmac, randomBytes } from "node:crypto"
import { and, eq, gte, inArray, sql } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { updateTag } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { courierFee } from "@/lib/delivery"
import { env } from "@/lib/env"
import { collectsTax, regimeAt } from "@/lib/gst"
import { isMaharashtraPincode, orderNumber } from "@/lib/orders"
import { unitPrice } from "@/lib/pricing"
import { withinLimit } from "@/lib/ratelimit"
import { customers, orderCharges, orderEvents, orderItems, orders, products, stockMovements, units } from "@/lib/schema"
import { getSettings } from "@/lib/settings"
import { todayInIndia } from "@/lib/time"

const optional = (max: number) => z.string().trim().max(max)

const input = z
  .object({
    idempotencyKey: z.uuid(),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"),
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.union([z.literal(""), z.email("Enter a valid email or leave it empty")]),
    delivery: z.enum(["pickup", "ship"]),
    line1: optional(120),
    line2: optional(120),
    landmark: optional(80),
    city: optional(60),
    pincode: optional(6),
    payment: z.enum(["pay_at_store", "upi_manual"]),
    note: optional(500),
    whatsappUpdates: z.boolean(),
    lines: z.array(z.object({ id: z.number().int().positive(), qty: z.number().int().positive().max(10000), unitPaise: z.number().int().nonnegative() })).min(1).max(100),
  })
  .superRefine((v, ctx) => {
    if (v.delivery !== "ship") return
    if (v.line1.length < 3) ctx.addIssue({ code: "custom", path: ["line1"], message: "Enter the flat or house and building" })
    if (v.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "Enter the city" })
    if (!isMaharashtraPincode(v.pincode)) ctx.addIssue({ code: "custom", path: ["pincode"], message: "We deliver within Maharashtra only. Enter a pincode starting 40 to 44" })
    if (v.payment !== "upi_manual") ctx.addIssue({ code: "custom", path: ["payment"], message: "Courier orders are paid by UPI" })
  })

export type CheckoutInput = z.input<typeof input>

export type CheckoutResult =
  | { ok: true; number: string }
  | { ok: false; kind: "fields"; fields: Record<string, string> }
  | { ok: false; kind: "price"; changed: { id: number; unitPaise: number }[] }
  | { ok: false; kind: "stock"; ids: number[] }
  | { ok: false; kind: "message"; message: string }

class Refusal extends Error {
  constructor(readonly result: CheckoutResult) {
    super("refused")
  }
}

const NOTICE_VERSION = "2026-11-22"

export async function placeOrder(raw: unknown): Promise<CheckoutResult> {
  const parsed = input.safeParse(raw)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message
    return { ok: false, kind: "fields", fields }
  }
  const v = parsed.data
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const phoneHash = createHmac("sha256", env.PHONE_PEPPER).update(v.phone).digest("hex")
  const requestHash = createHash("sha256").update(JSON.stringify({ ...v, idempotencyKey: undefined })).digest("hex")

  const [existing] = await db.select({ id: orders.id, requestHash: orders.requestHash }).from(orders).where(eq(orders.idempotencyKey, v.idempotencyKey))
  if (existing) {
    return existing.requestHash === requestHash ? { ok: true, number: orderNumber(existing.id) } : { ok: false, kind: "message", message: "This order was already placed. Refresh the page to start a new one." }
  }

  const [phoneOk, ipOk] = await Promise.all([withinLimit(`order:phone:${phoneHash}`, 3600, 5), ip ? withinLimit(`order:ip:${ip}`, 600, 10) : Promise.resolve(true)])
  if (!phoneOk || !ipOk) return { ok: false, kind: "message", message: "Too many orders in a short time. Wait a few minutes, or order on WhatsApp." }

  const [settings, regime] = await Promise.all([getSettings(), regimeAt(todayInIndia())])
  if (collectsTax(regime.scheme)) return { ok: false, kind: "message", message: "Online orders are paused for a moment. Order on WhatsApp." }
  if (v.delivery === "ship" && !settings.courierAvailable) return { ok: false, kind: "message", message: "Delivery is not available right now. Choose pickup." }

  const merged = new Map<number, { qty: number; unitPaise: number }>()
  for (const l of v.lines) merged.set(l.id, { qty: (merged.get(l.id)?.qty ?? 0) + l.qty, unitPaise: l.unitPaise })
  const ids = [...merged.keys()].sort((a, b) => a - b)

  const secret = randomBytes(32).toString("base64url")
  try {
    const id = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ product: products, uqc: units.uqc })
        .from(products)
        .innerJoin(units, eq(units.code, products.unit))
        .where(and(inArray(products.id, ids), eq(products.status, "active")))
        .orderBy(products.id)
        .for("update", { of: products })
      const byId = new Map(rows.map((r) => [r.product.id, r]))
      const missing = ids.filter((pid) => !byId.has(pid))
      if (missing.length) throw new Refusal({ ok: false, kind: "stock", ids: missing })

      const changed: { id: number; unitPaise: number }[] = []
      const short: number[] = []
      const priced = ids.map((pid) => {
        const row = byId.get(pid)
        const line = merged.get(pid)
        if (!row || !line) throw new Error("line lost")
        const p = row.product
        if (v.delivery === "ship" && p.fulfilment === "pickup_or_freight") throw new Refusal({ ok: false, kind: "message", message: `${p.name} can only be picked up at the shop. Choose pickup, or remove it.` })
        if (p.stock !== null && p.stock < line.qty) short.push(pid)
        let price: ReturnType<typeof unitPrice>
        try {
          price = unitPrice({ retailPaise: p.retailPaise, wholesalePaise: p.wholesalePaise, moq: p.moq, minOrderQty: p.minOrderQty, orderStep: p.orderStep }, line.qty)
        } catch {
          throw new Refusal({ ok: false, kind: "message", message: `Check the quantity of ${p.name} in your cart.` })
        }
        if (price.paise !== line.unitPaise) changed.push({ id: pid, unitPaise: price.paise })
        return { row, qty: line.qty, price }
      })
      if (short.length) throw new Refusal({ ok: false, kind: "stock", ids: short })
      if (changed.length) throw new Refusal({ ok: false, kind: "price", changed })

      const itemsPaise = priced.reduce((sum, l) => sum + l.price.paise * l.qty, 0)
      const fee = v.delivery === "ship" ? courierFee(settings, itemsPaise) : 0
      if (itemsPaise < settings.minOrderPaise) throw new Refusal({ ok: false, kind: "message", message: `The minimum order is ₹${String(settings.minOrderPaise / 100)}.` })

      for (const l of priced) {
        if (l.row.product.stock === null) continue
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${l.qty}` })
          .where(and(eq(products.id, l.row.product.id), gte(products.stock, l.qty)))
      }

      const [customer] = await tx
        .insert(customers)
        .values({ phone: v.phone, phoneHash, firstName: v.name.split(" ")[0] ?? v.name })
        .onConflictDoUpdate({ target: customers.phoneHash, set: { phone: v.phone, firstName: v.name.split(" ")[0] ?? v.name } })
        .returning({ id: customers.id })
      if (!customer) throw new Error("customer insert failed")

      const now = new Date()
      const [order] = await tx
        .insert(orders)
        .values({
          customerId: customer.id,
          channel: "web_whatsapp",
          stage: fee === null ? "quote_pending" : "requested",
          payment: "unpaid",
          method: v.payment,
          delivery: v.delivery,
          contact: { name: v.name, phone: v.phone, email: v.email === "" ? null : v.email, businessName: null, gstin: null },
          shipTo:
            v.delivery === "ship"
              ? { name: v.name, phone: v.phone, line1: v.line1, line2: v.line2, landmark: v.landmark, city: v.city, state: "Maharashtra", stateCode: "27", pincode: v.pincode }
              : null,
          consent: { whatsappUpdates: v.whatsappUpdates, noticeVersion: NOTICE_VERSION, at: now.toISOString() },
          placeOfSupply: "27",
          scheme: regime.scheme,
          itemsPaise,
          chargesPaise: fee ?? 0,
          totalPaise: itemsPaise + (fee ?? 0),
          taxPaise: 0,
          idempotencyKey: v.idempotencyKey,
          requestHash,
          customerNote: v.note,
          holdUntil: new Date(now.getTime() + 24 * 3600 * 1000),
          clientIp: ip,
          cookieHash: createHash("sha256").update(secret).digest("hex"),
        })
        .returning({ id: orders.id })
      if (!order) throw new Error("order insert failed")

      await tx.insert(orderItems).values(
        priced.map((l) => ({
          orderId: order.id,
          productId: l.row.product.id,
          name: l.row.product.name,
          sku: l.row.product.sku,
          hsn: l.row.product.hsn,
          unit: l.row.product.unit,
          uqc: l.row.uqc,
          gstRateBps: l.row.product.gstRateBps,
          qty: l.qty,
          unitPaise: l.price.paise,
          tier: l.price.tier,
          linePaise: l.price.paise * l.qty,
          taxablePaise: l.price.paise * l.qty,
          taxPaise: 0,
          reserved: l.row.product.stock !== null,
          fulfilment: l.row.product.fulfilment,
        })),
      )
      if (fee) await tx.insert(orderCharges).values({ orderId: order.id, kind: "shipping", amountPaise: fee, gstRateBps: 0, taxablePaise: fee, taxPaise: 0 })
      const reserved = priced.filter((l) => l.row.product.stock !== null)
      if (reserved.length) await tx.insert(stockMovements).values(reserved.map((l) => ({ productId: l.row.product.id, delta: -l.qty, reason: "sold_online" as const, orderId: order.id })))
      await tx.insert(orderEvents).values({ orderId: order.id, type: "placed", data: { delivery: v.delivery, method: v.payment, items: itemsPaise } })
      return order.id
    })

    const jar = await cookies()
    jar.set(`ws_order_${String(id)}`, secret, { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", path: `/order/${orderNumber(id)}`, maxAge: 30 * 24 * 3600 })
    for (const pid of ids) updateTag(`product:${String(pid)}`)
    updateTag("catalog")
    return { ok: true, number: orderNumber(id) }
  } catch (e) {
    if (e instanceof Refusal) return e.result
    if (e instanceof Error && /orders_idempotency_key/.test(e.message)) {
      const [again] = await db.select({ id: orders.id }).from(orders).where(eq(orders.idempotencyKey, v.idempotencyKey))
      if (again) return { ok: true, number: orderNumber(again.id) }
    }
    throw e
  }
}
