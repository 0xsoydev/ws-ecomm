"use server"

import { and, eq, inArray } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole, rolesOf } from "@/lib/auth"
import { db, violated } from "@/lib/db"
import { hasRetailTier } from "@/lib/pricing"
import { auditLog, batteryKind, bodyStyle, fulfilment, priceHistory, productImages, products, productStatus, productVehicles, specsSchema, stockMovements } from "@/lib/schema"

const text = (max: number) => z.string().trim().max(max).transform((s) => (s === "" ? null : s))
const paise = z.number().int().positive().nullable()

const input = z.object({
  id: z.number().int().positive(),
  expectedUpdatedAt: z.iso.datetime(),
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
  stockSeen: z.number().int().min(0).nullable(),
  stockNote: z.string().trim().max(200),
  bin: text(40),
  lowStockAt: z.number().int().min(0).max(100000).nullable(),
  weightGrams: z.number().int().min(1).max(200000).nullable(),
  fulfilment: z.enum(fulfilment.enumValues),
  specs: specsSchema,
  specsReviewed: z.boolean(),
  wholesalePaise: z.number().int().positive(),
  retailPaise: paise,
  priceApproved: z.boolean(),
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
  photos: z.array(z.object({ id: z.number().int().positive(), ownPhoto: z.boolean(), watermarked: z.boolean(), onWhite: z.boolean(), classified: z.boolean() })).max(40),
  removedPhotos: z.array(z.number().int().positive()).max(40),
  fits: z.array(z.object({ modelId: z.number().int().positive(), verified: z.boolean() })).max(100),
})

export type SaveInput = z.input<typeof input>
export type SaveResult = { ok: true } | { ok: false; message: string; conflict?: boolean }

const PRICE_FIELDS = ["wholesalePaise", "retailPaise", "priceApproved", "moq", "minOrderQty", "orderStep", "mrpPaise", "costPaise", "gstRateBps", "hsn"] as const
const CONTENT_FIELDS = ["name", "partCode", "status", "categoryId", "bodyStyle", "aliases", "description", "copyReviewed", "prePackaged", "maker", "makerAddress", "netQuantity", "batteryKind", "bisRegistration", "bin", "lowStockAt", "weightGrams", "fulfilment", "specsReviewed"] as const

class UserError extends Error {
  constructor(
    message: string,
    readonly conflict = false,
  ) {
    super(message)
  }
}

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
      if (p.updatedAt.toISOString() !== new Date(d.expectedUpdatedAt).toISOString()) throw new UserError("Someone else saved this product after you opened it. Reload to see their changes, then make yours again.", true)

      const tiered = hasRetailTier(d)
      const retailPaise = tiered ? d.retailPaise : null
      const next = { ...d, retailPaise, hsn: d.hsn }
      const priceChanged = PRICE_FIELDS.some((k) => p[k] !== next[k])
      if (priceChanged && !isOwner) throw new UserError("Only the owner can change prices, approval and tax fields")
      if (retailPaise !== null && retailPaise < d.wholesalePaise) throw new UserError("Retail cannot be below the wholesale price")
      if (retailPaise !== null && d.mrpPaise !== null && retailPaise > d.mrpPaise) throw new UserError("Retail cannot be above the MRP")
      const typed = d.counted ? d.stock : null
      const newStock = typed === d.stockSeen ? p.stock : typed
      if (newStock !== p.stock && p.stock !== null && !d.stockNote) throw new UserError("Add a note saying why the stock changed")

      const now = new Date()
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
          bisVerifiedAt: d.bisVerified && d.bisRegistration ? (p.bisRegistration === d.bisRegistration && p.bisVerifiedAt ? p.bisVerifiedAt : now) : null,
          stock: newStock,
          bin: d.bin,
          lowStockAt: d.lowStockAt,
          weightGrams: d.weightGrams,
          fulfilment: d.batteryKind === "none" ? d.fulfilment : "pickup_or_freight",
          specs: d.specs,
          specsReviewed: d.specsReviewed,
          wholesalePaise: d.wholesalePaise,
          retailPaise,
          priceApproved: d.priceApproved,
          moq: d.moq,
          minOrderQty: d.minOrderQty,
          orderStep: d.orderStep,
          mrpPaise: d.mrpPaise,
          costPaise: d.costPaise,
          gstRateBps: d.gstRateBps,
          hsn: d.hsn,
          updatedAt: now,
        })
        .where(eq(products.id, p.id))

      if (newStock !== p.stock) {
        const delta = (newStock ?? 0) - (p.stock ?? 0)
        const reason = p.stock === null || newStock === null ? "count" : "correction"
        const note = d.stockNote || (newStock === null ? "Set to not counted" : "First count")
        await tx.insert(stockMovements).values({ productId: p.id, delta, reason, note, actorId: user.id })
      }

      const photos = await tx.select().from(productImages).where(eq(productImages.productId, p.id))
      const kept = new Set(d.photos.map((x) => x.id))
      const gone = new Set(d.removedPhotos)
      if (photos.length !== kept.size + gone.size || photos.some((y) => !kept.has(y.id) && !gone.has(y.id))) throw new UserError("The photos changed after you opened this product. Reload and try again.", true)
      const photoChanges: string[] = []
      if (gone.size) await tx.delete(productImages).where(and(eq(productImages.productId, p.id), inArray(productImages.id, [...gone])))
      for (const [position, x] of d.photos.entries()) {
        const before = photos.find((y) => y.id === x.id)
        const after = { ownPhoto: x.ownPhoto && !x.watermarked, watermarked: x.watermarked, onWhite: x.onWhite, classified: x.classified, position }
        if (before && before.ownPhoto === after.ownPhoto && before.watermarked === after.watermarked && before.onWhite === after.onWhite && before.classified === after.classified && before.position === position) continue
        await tx.update(productImages).set(after).where(and(eq(productImages.id, x.id), eq(productImages.productId, p.id)))
        photoChanges.push(`${String(x.id)}:${after.classified ? (after.ownPhoto ? "ours" : "not ours") : "unsorted"}@${String(position)}`)
      }

      const fits = await tx.select().from(productVehicles).where(eq(productVehicles.productId, p.id))
      const fitChanges: Record<string, [unknown, unknown]> = {}
      for (const f of fits) {
        const wanted = d.fits.find((x) => x.modelId === f.modelId)
        if (!wanted) {
          await tx.delete(productVehicles).where(and(eq(productVehicles.productId, p.id), eq(productVehicles.modelId, f.modelId)))
          fitChanges[`vehicle:${String(f.modelId)}`] = [f.verified ? "checked" : "sold for", null]
        } else if (wanted.verified !== f.verified) {
          await tx.update(productVehicles).set({ verified: wanted.verified }).where(and(eq(productVehicles.productId, p.id), eq(productVehicles.modelId, f.modelId)))
          fitChanges[`vehicle:${String(f.modelId)}`] = [f.verified ? "checked" : "sold for", wanted.verified ? "checked" : "sold for"]
        }
      }
      for (const x of d.fits) {
        if (fits.some((f) => f.modelId === x.modelId)) continue
        await tx.insert(productVehicles).values({ productId: p.id, modelId: x.modelId, verified: x.verified, source: "Added by staff" })
        fitChanges[`vehicle:${String(x.modelId)}`] = [null, x.verified ? "checked" : "sold for"]
      }

      if (priceChanged) {
        await tx.insert(priceHistory).values({ productId: p.id, retailPaise, wholesalePaise: d.wholesalePaise, actorId: user.id })
        const diff: Record<string, [unknown, unknown]> = {}
        for (const k of PRICE_FIELDS) if (p[k] !== next[k]) diff[k] = [p[k], next[k]]
        await tx.insert(auditLog).values({ actorId: user.id, entity: "product", entityId: String(p.id), action: "price", diff })
      }
      const content: Record<string, [unknown, unknown]> = { ...fitChanges }
      for (const k of CONTENT_FIELDS) if (p[k] !== d[k]) content[k] = [p[k], d[k]]
      if (JSON.stringify(p.specs) !== JSON.stringify(d.specs)) content.specs = [p.specs, d.specs]
      if (photoChanges.length) content.photos = [null, photoChanges.join(" ")]
      if (gone.size) content.photosRemoved = [photos.filter((y) => gone.has(y.id)).map((y) => y.publicId).join(" "), null]
      if (Object.keys(content).length) await tx.insert(auditLog).values({ actorId: user.id, entity: "product", entityId: String(p.id), action: "content", diff: content })
    })
  } catch (error) {
    if (error instanceof UserError) return { ok: false, message: error.message, conflict: error.conflict }
    const constraint = violated(error)
    if (constraint === "product_qty") return { ok: false, message: "Minimum order and wholesale break must be multiples of the pack step, and the minimum cannot exceed the break" }
    if (constraint === "product_mrp") return { ok: false, message: "MRP cannot be below the selling price" }
    throw error
  }
  updateTag(`product:${String(d.id)}`)
  updateTag("catalog")
  refresh()
  return { ok: true }
}
