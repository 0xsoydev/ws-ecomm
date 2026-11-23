"use server"

import { and, eq, sql } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { db, violated } from "@/lib/db"
import { next, type Stage } from "@/lib/orders"
import { auditLog, orderCharges, orderEvents, orderItems, orders, orderStage, payments, products, shipments, stockMovements } from "@/lib/schema"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type ActionResult = { ok: true } | { ok: false; message: string }

async function locked(tx: Tx, id: number) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update")
  if (!order) throw new Error("Order not found")
  return order
}

async function move(tx: Tx, id: number, from: Stage, to: Stage, actorId: string, data: Record<string, string | number | boolean | null> = {}) {
  if (!next[from].includes(to)) throw new Error(`Cannot move from ${from} to ${to}`)
  const [moved] = await tx
    .update(orders)
    .set({ stage: to, updatedAt: new Date(), holdUntil: to === "cancelled" || to === "picked_up" || to === "delivered" || to === "shipped" ? null : sql`${orders.holdUntil}` })
    .where(and(eq(orders.id, id), eq(orders.stage, from)))
    .returning({ id: orders.id })
  if (!moved) throw new Error("The order changed. Refresh and try again.")
  await tx.insert(orderEvents).values({ orderId: id, type: "stage", actorId, data: { from, to, ...data } })
}

async function run<T>(schema: z.ZodType<T>, raw: unknown, work: (tx: Tx, actorId: string, v: T) => Promise<number[] | undefined>): Promise<ActionResult> {
  const session = await requireRole("owner", "staff")
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details" }
  const v = parsed.data
  try {
    const touched = await db.transaction((tx) => work(tx, session.user.id, v))
    for (const pid of touched ?? []) updateTag(`product:${String(pid)}`)
    if (touched?.length) updateTag("catalog")
    refresh()
    return { ok: true }
  } catch (e) {
    if (violated(e) === "payment_manual_utr") return { ok: false, message: "This UPI reference was already used." }
    return { ok: false, message: e instanceof Error && !violated(e) && !e.message.startsWith("Failed query") ? e.message : "Something went wrong. Try again." }
  }
}

const idSchema = z.number().int().positive()
const stageSchema = z.enum(orderStage.enumValues)

export async function moveStage(raw: unknown) {
  return run(z.object({ id: idSchema, from: stageSchema, to: z.enum(["packed", "ready_for_pickup", "delivered", "picked_up"]) }), raw, async (tx, actor, v) => {
    const order = await locked(tx, v.id)
    if (order.stage !== v.from) throw new Error("The order changed. Refresh and try again.")
    if ((v.to === "packed" || v.to === "delivered") && order.delivery === "pickup") throw new Error("This order is picked up at the shop.")
    if ((v.to === "ready_for_pickup" || v.to === "picked_up") && order.delivery !== "pickup") throw new Error("This order goes by courier.")
    if ((v.to === "packed" || v.to === "ready_for_pickup") && order.method === "upi_manual" && order.payment !== "paid") throw new Error("Record the UPI payment first.")
    if (v.to === "picked_up" && order.method === "pay_at_store") {
      await tx.update(orders).set({ payment: "paid" }).where(eq(orders.id, v.id))
      await tx.insert(payments).values({ orderId: v.id, provider: "manual", amountPaise: order.totalPaise, status: "captured", method: "at_shop", isTest: order.isTest, verifiedBy: actor })
      await tx.insert(orderEvents).values({ orderId: v.id, type: "payment", actorId: actor, data: { amount: order.totalPaise, method: "at_shop" } })
    }
    await move(tx, v.id, order.stage, v.to, actor)
    return undefined
  })
}

export async function confirmOrder(raw: unknown) {
  return run(z.object({ id: idSchema, deliveryPaise: z.number().int().min(0).max(10000000).nullable() }), raw, async (tx, actor, v) => {
    const order = await locked(tx, v.id)
    if (order.stage !== "requested" && order.stage !== "quote_pending") throw new Error("Only new orders can be confirmed.")
    if (order.stage === "quote_pending") {
      if (v.deliveryPaise === null) throw new Error("Enter the delivery charge.")
      if (v.deliveryPaise > 0) {
        await tx.insert(orderCharges).values({ orderId: v.id, kind: "shipping", amountPaise: v.deliveryPaise, gstRateBps: 0, taxablePaise: v.deliveryPaise, taxPaise: 0 })
        await tx
          .update(orders)
          .set({ chargesPaise: sql`${orders.chargesPaise} + ${v.deliveryPaise}`, totalPaise: sql`${orders.totalPaise} + ${v.deliveryPaise}` })
          .where(eq(orders.id, v.id))
      }
    }
    const lines = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, v.id), eq(orderItems.reserved, false)))
    const ids = [...new Set(lines.map((l) => l.productId))].sort((a, b) => a - b)
    const stock = new Map<number, { name: string; stock: number | null }>()
    for (const pid of ids) {
      const [p] = await tx.select({ name: products.name, stock: products.stock }).from(products).where(eq(products.id, pid)).for("update")
      if (p) stock.set(pid, p)
    }
    const tracked = lines.filter((l) => stock.get(l.productId)?.stock != null)
    const short = tracked.filter((l) => (stock.get(l.productId)?.stock ?? 0) < l.qty)
    if (short.length) throw new Error(`Not enough stock for ${short.map((l) => stock.get(l.productId)?.name ?? l.name).join(", ")}. Update the stock or cancel the order.`)
    for (const l of tracked) {
      await tx.update(products).set({ stock: sql`${products.stock} - ${l.qty}` }).where(eq(products.id, l.productId))
      await tx.update(orderItems).set({ reserved: true }).where(eq(orderItems.id, l.id))
      await tx.insert(stockMovements).values({ productId: l.productId, delta: -l.qty, reason: "sold_online", orderId: v.id, actorId: actor })
    }
    await move(tx, v.id, order.stage, "confirmed", actor, { delivery: v.deliveryPaise })
    return [...new Set(tracked.map((l) => l.productId))]
  })
}

export async function cancelOrder(raw: unknown) {
  return run(z.object({ id: idSchema, reason: z.string().trim().min(3, "Give a reason").max(200) }), raw, async (tx, actor, v) => {
    const order = await locked(tx, v.id)
    if (!next[order.stage].includes("cancelled")) throw new Error("This order can no longer be cancelled here.")
    if (order.payment !== "unpaid") throw new Error("This order has a payment. Refund it first, then cancel.")
    const lines = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, v.id), eq(orderItems.reserved, true)))
    const ids = [...new Set(lines.map((l) => l.productId))].sort((a, b) => a - b)
    for (const pid of ids) await tx.select({ id: products.id }).from(products).where(eq(products.id, pid)).for("update")
    for (const l of lines) {
      await tx.update(products).set({ stock: sql`${products.stock} + ${l.qty}` }).where(and(eq(products.id, l.productId), sql`${products.stock} is not null`))
      await tx.insert(stockMovements).values({ productId: l.productId, delta: l.qty, reason: "order_cancelled", orderId: v.id, actorId: actor })
    }
    await move(tx, v.id, order.stage, "cancelled", actor, { reason: v.reason })
    return ids
  })
}

export async function recordUpi(raw: unknown) {
  const schema = z.object({ id: idSchema, utr: z.string().trim().regex(/^\d{12}$/, "A UPI reference has 12 digits"), amountPaise: z.number().int().positive() })
  return run(schema, raw, async (tx, actor, { id, utr, amountPaise }) => {
    const order = await locked(tx, id)
    if (order.method !== "upi_manual") throw new Error("This order is not paid by UPI.")
    if (order.stage === "cancelled" || order.stage === "requested" || order.stage === "quote_pending") throw new Error("Confirm the order before recording a payment.")
    const [{ paid } = { paid: 0 }] = await tx
      .select({ paid: sql<number>`coalesce(sum(${payments.amountPaise}), 0)::int` })
      .from(payments)
      .where(and(eq(payments.orderId, id), eq(payments.status, "captured")))
    const total = paid + amountPaise
    if (total > order.totalPaise) throw new Error("That is more than the order total.")
    await tx.insert(payments).values({ orderId: id, provider: "manual", utr, amountPaise, status: "captured", method: "upi", isTest: order.isTest, verifiedBy: actor })
    await tx.update(orders).set({ payment: total === order.totalPaise ? "paid" : "partially_paid" }).where(eq(orders.id, id))
    await tx.insert(orderEvents).values({ orderId: id, type: "payment", actorId: actor, data: { utr, amount: amountPaise } })
    await tx.insert(auditLog).values({ actorId: actor, entity: "order", entityId: String(id), action: "utr_recorded", diff: { utr: [null, utr], amount: [null, amountPaise] } })
    return undefined
  })
}

export async function markShipped(raw: unknown) {
  const schema = z.object({ id: idSchema, courier: z.string().trim().min(2, "Enter the courier").max(60), awb: z.string().trim().min(4, "Enter the tracking number").max(40), trackingUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, error: "Use an https:// tracking link" })]) })
  return run(schema, raw, async (tx, actor, { id, courier, awb, trackingUrl }) => {
    const order = await locked(tx, id)
    if (order.delivery === "pickup") throw new Error("This order is picked up at the shop.")
    if (order.stage !== "packed") throw new Error("Mark the order packed first.")
    await tx.insert(shipments).values({ orderId: id, courier, awb, trackingUrl: trackingUrl || null, status: "shipped" })
    await tx.insert(orderEvents).values({ orderId: id, type: "shipment", actorId: actor, data: { courier, awb } })
    await move(tx, id, "packed", "shipped", actor)
    return undefined
  })
}
