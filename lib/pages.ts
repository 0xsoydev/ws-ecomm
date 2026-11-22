import "server-only"
import { eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"
import { db } from "./db"
import { pages } from "./schema"

export const POLICY_SLUGS = ["shipping", "returns", "warranty", "terms", "privacy"] as const

export async function contentPage(slug: string) {
  "use cache"
  cacheTag(`page:${slug}`)
  cacheLife("max")
  const [row] = await db.select().from(pages).where(eq(pages.slug, slug))
  return row ?? null
}
