import "server-only"
import { desc, lte } from "drizzle-orm"
import { db } from "./db"
import { gstRegimes, type gstScheme } from "./schema"
import { todayInIndia } from "./time"

export type Scheme = (typeof gstScheme.enumValues)[number]

export async function regimeAt(date: string) {
  const [row] = await db.select().from(gstRegimes).where(lte(gstRegimes.fromDate, date)).orderBy(desc(gstRegimes.fromDate)).limit(1)
  return { scheme: row?.scheme ?? "unregistered", gstin: row?.gstin ?? null, fromDate: row?.fromDate ?? null }
}

export const collectsTax = (scheme: Scheme) => scheme === "regular"
export const interStateAllowed = (scheme: Scheme) => scheme === "regular"
export const isRegistered = (scheme: Scheme) => scheme !== "unregistered"

export async function currentScheme() {
  return (await regimeAt(todayInIndia())).scheme
}
