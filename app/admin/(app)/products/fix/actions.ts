"use server"

import { inArray } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { products } from "@/lib/schema"

const optional = (max: number) => z.string().trim().max(max).optional()

const input = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(500),
    maker: optional(160),
    makerAddress: optional(400),
    prePackaged: z.boolean().optional(),
  })
  .refine((d) => d.maker || d.makerAddress || d.prePackaged !== undefined, "Fill at least one field")

export async function setLegalFields(raw: unknown) {
  await requireRole("owner", "staff")
  const d = input.parse(raw)
  const updated = await db
    .update(products)
    .set({
      ...(d.maker ? { maker: d.maker } : {}),
      ...(d.makerAddress ? { makerAddress: d.makerAddress } : {}),
      ...(d.prePackaged !== undefined ? { prePackaged: d.prePackaged } : {}),
      updatedAt: new Date(),
    })
    .where(inArray(products.id, d.ids))
    .returning({ id: products.id })
  for (const { id } of updated) updateTag(`product:${String(id)}`)
  updateTag("catalog")
  refresh()
  return updated.length
}
