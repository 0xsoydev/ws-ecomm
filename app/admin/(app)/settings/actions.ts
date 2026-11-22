"use server"

import { eq } from "drizzle-orm"
import { refresh, updateTag } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { auditLog, settings, settingsSchema } from "@/lib/schema"
import { getSettings } from "@/lib/settings"

const rupees = z.number().int().min(0).max(100000000)

const input = z.object({
  courierAvailable: z.boolean(),
  shippingBands: z.array(z.object({ upToPaise: rupees.min(100), feePaise: rupees })).max(6),
  freeShippingFromPaise: rupees.nullable(),
  minOrderPaise: rupees,
  upiVpa: z.union([z.literal(""), z.string().trim().regex(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/, "A UPI ID looks like name@bank")]),
  upiVpaIsMerchant: z.boolean(),
  reviewLink: z.union([z.literal(""), z.url("Paste the full link, starting https://")]),
})

export type SettingsInput = z.input<typeof input>

export async function saveSettings(raw: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireRole("owner")
  const parsed = input.safeParse(raw)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values" }
  const v = parsed.data
  const before = await getSettings()
  const next = settingsSchema.parse({
    ...before,
    courierAvailable: v.courierAvailable,
    shippingBands: [...v.shippingBands].sort((a, b) => a.upToPaise - b.upToPaise),
    freeShippingFromPaise: v.freeShippingFromPaise,
    minOrderPaise: v.minOrderPaise,
    upiVpa: v.upiVpa === "" ? null : v.upiVpa,
    upiVpaIsMerchant: v.upiVpa !== "" && v.upiVpaIsMerchant,
    reviewLink: v.reviewLink === "" ? null : v.reviewLink,
  })
  const keys = ["courierAvailable", "shippingBands", "freeShippingFromPaise", "minOrderPaise", "upiVpa", "upiVpaIsMerchant", "reviewLink"] as const
  const diff: Record<string, [unknown, unknown]> = {}
  for (const k of keys) if (JSON.stringify(before[k]) !== JSON.stringify(next[k])) diff[k] = [before[k], next[k]]
  if (Object.keys(diff).length === 0) return { ok: true }
  await db.transaction(async (tx) => {
    await tx.update(settings).set({ data: next, updatedAt: new Date() }).where(eq(settings.id, 1))
    await tx.insert(auditLog).values({ actorId: session.user.id, entity: "settings", entityId: "1", action: "settings", diff })
  })
  updateTag("settings")
  updateTag("catalog")
  refresh()
  return { ok: true }
}
