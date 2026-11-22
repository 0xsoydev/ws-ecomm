"use server"

import { eq } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { productImages } from "@/lib/schema"

const input = z.object({ id: z.number().int().positive(), ownPhoto: z.boolean(), watermarked: z.boolean(), onWhite: z.boolean(), classified: z.boolean() })

export async function classifyPhoto(raw: unknown) {
  await requireRole("owner", "staff")
  const { id, ownPhoto, watermarked, onWhite, classified } = input.parse(raw)
  const [row] = await db
    .update(productImages)
    .set({ ownPhoto: ownPhoto && !watermarked, watermarked, onWhite, classified })
    .where(eq(productImages.id, id))
    .returning({ productId: productImages.productId })
  if (!row) throw new Error("Photo not found")
  updateTag(`product:${String(row.productId)}`)
  updateTag("catalog")
}
