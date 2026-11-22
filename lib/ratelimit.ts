import "server-only"
import { sql } from "drizzle-orm"
import { db } from "./db"
import { rateLimits } from "./schema"

export async function withinLimit(key: string, windowSeconds: number, max: number) {
  const span = windowSeconds * 1000
  const windowStart = new Date(Math.floor(Date.now() / span) * span)
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count })
  return (row?.count ?? max + 1) <= max
}
