import type { MetadataRoute } from "next"
import { env } from "@/lib/env"
import { publicEnv } from "@/lib/env.public"
import { catalog } from "@/lib/storefront"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!env.SITE_INDEXABLE) return []
  const site = publicEnv.NEXT_PUBLIC_SITE_URL
  const data = await catalog()
  const system = new Map(data.systems.map((s) => [s.id, s.slug]))
  return [
    ...["", "/store", "/wholesale", "/service", "/prices", "/v", "/ev-scooters"].map((p) => ({ url: `${site}${p}` })),
    ...data.systems.map((s) => ({ url: `${site}/c/${s.slug}` })),
    ...data.categories.filter((c) => c.count > 0).map((c) => ({ url: `${site}/c/${system.get(c.systemId) ?? ""}/${c.slug}` })),
    ...data.tiles.filter((t) => t.image).map((t) => ({ url: `${site}/p/${t.slug}` })),
  ]
}
