"use server"

import { eq } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole, rolesOf } from "@/lib/auth"
import { db } from "@/lib/db"
import { auditLog, batteryKind, bodyStyle, fulfilment, priceHistory, products, productStatus, specsSchema, stockMovements } from "@/lib/schema"

const text = (max: number) => z.string().trim().max(max).transform((s) => (s === "" ? null : s))
const paise = z.number().int().positive().nullable()

const input = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  partCode: text(80),
  status: z.enum(productStatus.enumValues),
  categoryId: z.number().int().positive(),
  bodyStyle: z.enum(bodyStyle.enumValues).nullable(),
  aliases: z.string().trim().max(500),
  description: z.string().trim().max(4000),
  copyReviewed: z.boolean(),
  prePackaged: z.boolean().nullable(),
  maker: text(160),
  makerAddress: text(400),
  netQuantity: text(60),
  batteryKind: z.enum(batteryKind.enumValues),
  bisRegistration: text(40),
  bisVerified: z.boolean(),
  counted: z.boolean(),
  stock: z.number().int().min(0).max(1000000),
  stockNote: z.string().trim().max(200),
  bin: text(40),
  lowStockAt: z.number().int().min(0).max(100000).nullable(),
  weightGrams: z.number().int().min(1).max(200000).nullable(),
  fulfilment: z.enum(fulfilment.enumValues),
  specs: specsSchema,
  specsReviewed: z.boolean(),
  wholesalePaise: z.number().int().positive(),
  moq: z.number().int().min(1).max(10000),
  minOrderQty: z.number().int().min(1).max(10000),
  orderStep: z.number().int().min(1).max(10000),
  mrpPaise: paise,
  costPaise: paise,
  gstRateBps: z.union([z.literal(0), z.literal(500), z.literal(1800), z.literal(4000)]),
  hsn: z
    .string()
    .trim()
    .regex(/^(\d{4,8})?$/, "HSN is 4 to 8 digits")
    .transform((s) => (s === "" ? null : s)),
})

export type SaveResult = { ok: true } | { ok: false; message: string }

const PRICE_FIELDS = ["wholesalePaise", "moq", "minOrderQty", "orderStep", "mrpPaise", "costPaise", "gstRateBps", "hsn"] as const

export async function saveProduct(raw: unknown): Promise<SaveResult> {
  const { user } = await requireRole("owner", "staff")
  const parsed = input.safeParse(raw)
  if (!parsed.success) return { ok: false, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }
  const d = parsed.data
  const isOwner = rolesOf(user.role).includes("owner")
  try {
    await db.transaction(async (tx) => {
      const [p] = await tx.select().from(products).where(eq(products.id, d.id)).for("update")
      if (!p) throw new UserError("Product not found")
      const priceChanged = PRICE_FIELDS.some((k) => p[k] !== d[k])
      if (priceChanged && !isOwner) throw new UserError("Only the owner can change prices and tax fields")
      const newStock = d.counted ? d.stock : null
      if (newStock !== p.stock && p.stock !== null && !d.stockNote) throw new UserError("Add a note saying why the stock changed")
      const retailStillValid = p.retailPaise === null || (d.moq > 1 && d.minOrderQty < d.moq && p.retailPaise >= d.wholesalePaise)
      await tx
        .update(products)
        .set({
          name: d.name,
          partCode: d.partCode,
          status: d.status,
          categoryId: d.categoryId,
          bodyStyle: d.bodyStyle,
          aliases: d.aliases,
          description: d.description,
          copyReviewed: d.copyReviewed,
          prePackaged: d.prePackaged,
          maker: d.maker,
          makerAddress: d.makerAddress,
          netQuantity: d.netQuantity,
          batteryKind: d.batteryKind,
          bisRegistration: d.bisRegistration,
          bisVerifiedAt: d.bisVerified && d.bisRegistration ? (p.bisRegistration === d.bisRegistration && p.bisVerifiedAt ? p.bisVerifiedAt : new Date()) : null,
          stock: newStock,
          bin: d.bin,
          lowStockAt: d.lowStockAt,
          weightGrams: d.weightGrams,
          fulfilment: d.batteryKind === "none" ? d.fulfilment : "pickup_or_freight",
          specs: d.specs,
          specsReviewed: d.specsReviewed,
          wholesalePaise: d.wholesalePaise,
          moq: d.moq,
          minOrderQty: d.minOrderQty,
          orderStep: d.orderStep,
          mrpPaise: d.mrpPaise,
          costPaise: d.costPaise,
          gstRateBps: d.gstRateBps,
          hsn: d.hsn,
          retailPaise: retailStillValid ? p.retailPaise : null,
          priceApproved: retailStillValid ? p.priceApproved : false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, p.id))
      if (newStock !== p.stock) {
        const delta = (newStock ?? 0) - (p.stock ?? 0)
        const reason = p.stock === null || newStock === null ? "count" : "correction"
        const note = d.stockNote || (newStock === null ? "Set to not counted" : "First count")
        await tx.insert(stockMovements).values({ productId: p.id, delta, reason, note, actorId: user.id })
      }
      if (priceChanged) {
        await tx.insert(priceHistory).values({ productId: p.id, retailPaise: retailStillValid ? p.retailPaise : null, wholesalePaise: d.wholesalePaise, actorId: user.id })
        const diff: Record<string, [unknown, unknown]> = {}
        for (const k of PRICE_FIELDS) if (p[k] !== d[k]) diff[k] = [p[k], d[k]]
        await tx.insert(auditLog).values({ actorId: user.id, entity: "product", entityId: String(p.id), action: "price", diff })
      }
    })
  } catch (error) {
    if (error instanceof UserError) return { ok: false, message: error.message }
    const constraint = constraintOf(error)
    if (constraint === "product_qty") return { ok: false, message: "Minimum order and wholesale break must be multiples of the pack step, and the minimum cannot exceed the break" }
    if (constraint === "product_mrp") return { ok: false, message: "MRP cannot be below the selling price" }
    throw error
  }
  updateTag(`product:${String(d.id)}`)
  updateTag("catalog")
  refresh()
  return { ok: true }
}

class UserError extends Error {}

function constraintOf(error: unknown): string {
  if (!(error instanceof Error)) return ""
  if ("constraint" in error && typeof error.constraint === "string") return error.constraint
  return constraintOf(error.cause)
}
