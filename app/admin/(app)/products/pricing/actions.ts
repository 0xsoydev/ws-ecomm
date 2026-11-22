"use server"

import { eq } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasRetailTier } from "@/lib/pricing"
import { auditLog, priceHistory, products } from "@/lib/schema"

const input = z
  .array(z.object({ id: z.number().int().positive(), retailPaise: z.number().int().positive().nullable() }))
  .min(1)
  .max(500)

export type ApproveResult = { approved: number; errors: { id: number; message: string }[] }

export async function approvePrices(raw: unknown): Promise<ApproveResult> {
  const { user } = await requireRole("owner")
  const items = input.parse(raw)
  const errors: ApproveResult["errors"] = []
  const approvedIds: number[] = []
  await db.transaction(async (tx) => {
    for (const item of [...items].sort((a, b) => a.id - b.id)) {
      const [p] = await tx.select().from(products).where(eq(products.id, item.id)).for("update")
      if (!p) {
        errors.push({ id: item.id, message: "Product not found" })
        continue
      }
      const tiered = hasRetailTier(p)
      if (item.retailPaise !== null) {
        if (!tiered) {
          errors.push({ id: p.id, message: "This product sells at one price, so it has no retail price" })
          continue
        }
        if (item.retailPaise < p.wholesalePaise) {
          errors.push({ id: p.id, message: "Retail cannot be below wholesale" })
          continue
        }
        if (p.mrpPaise !== null && item.retailPaise > p.mrpPaise) {
          errors.push({ id: p.id, message: "Retail cannot be above MRP" })
          continue
        }
      }
      const moq = item.retailPaise === null && tiered ? p.minOrderQty : p.moq
      await tx.update(products).set({ retailPaise: item.retailPaise, priceApproved: true, moq, updatedAt: new Date() }).where(eq(products.id, p.id))
      await tx.insert(priceHistory).values({ productId: p.id, retailPaise: item.retailPaise, wholesalePaise: p.wholesalePaise, actorId: user.id })
      const diff: Record<string, [unknown, unknown]> = { retailPaise: [p.retailPaise, item.retailPaise], priceApproved: [p.priceApproved, true] }
      if (moq !== p.moq) diff.moq = [p.moq, moq]
      await tx.insert(auditLog).values({ actorId: user.id, entity: "product", entityId: String(p.id), action: "price", diff })
      approvedIds.push(p.id)
    }
  })
  for (const id of approvedIds) updateTag(`product:${String(id)}`)
  if (approvedIds.length) updateTag("catalog")
  refresh()
  return { approved: approvedIds.length, errors }
}
