"use server"

import { and, eq } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { auditLog, productVehicles } from "@/lib/schema"

const input = z.object({ productId: z.number().int().positive(), modelId: z.number().int().positive(), action: z.enum(["approve", "remove", "add"]) })

export async function changeFit(raw: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireRole("owner", "staff")
  const parsed = input.safeParse(raw)
  if (!parsed.success) return { ok: false, message: "Check the details" }
  const { productId, modelId, action } = parsed.data
  await db.transaction(async (tx) => {
    const where = and(eq(productVehicles.productId, productId), eq(productVehicles.modelId, modelId))
    const [before] = await tx.select().from(productVehicles).where(where)
    if (action === "remove") await tx.delete(productVehicles).where(where)
    else await tx.insert(productVehicles).values({ productId, modelId, verified: true, source: before?.source || "Added by staff" }).onConflictDoUpdate({ target: [productVehicles.productId, productVehicles.modelId], set: { verified: true } })
    await tx.insert(auditLog).values({ actorId: session.user.id, entity: "product", entityId: String(productId), action: "content", diff: { [`vehicle:${String(modelId)}`]: [before ? (before.verified ? "checked" : "sold for") : null, action === "remove" ? null : "checked"] } })
  })
  updateTag(`product:${String(productId)}`)
  updateTag("catalog")
  refresh()
  return { ok: true }
}
