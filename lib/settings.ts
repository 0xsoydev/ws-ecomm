import "server-only"
import { eq } from "drizzle-orm"
import { db } from "./db"
import { collectsTax, currentScheme } from "./gst"
import { settings, settingsSchema, type StoreSettings } from "./schema"

let lastGood: StoreSettings | null = null

export async function getSettings() {
  const [row] = await db.select({ data: settings.data }).from(settings).where(eq(settings.id, 1))
  const parsed = settingsSchema.safeParse(row?.data ?? {})
  if (parsed.success) {
    lastGood = parsed.data
    return parsed.data
  }
  console.error("settings row failed to parse; serving last good value", parsed.error.issues)
  return lastGood ?? settingsSchema.parse({})
}

export async function purchasableContext() {
  const [current, scheme] = await Promise.all([getSettings(), currentScheme()])
  return { collectsTax: collectsTax(scheme), eprRegistration: current.eprRegistration, packStandard: current.certifications.packStandard }
}
