import type { MetadataRoute } from "next"
import { env } from "@/lib/env"
import { publicEnv } from "@/lib/env.public"
import { catalog, VEHICLE_INDEX_MIN, vehicleTiles } from "@/lib/storefront"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!env.SITE_INDEXABLE) return []
  const site = publicEnv.NEXT_PUBLIC_SITE_URL
  const data = await catalog()
  const system = new Map(data.systems.map((s) => [s.id, s.slug]))
  return [
    ...["", "/store", "/wholesale", "/service", "/prices", "/v"].map((p) => ({ url: `${site}${p}` })),
    ...data.systems.map((s) => ({ url: `${site}/c/${s.slug}` })),
    ...data.categories.filter((c) => c.count > 0).map((c) => ({ url: `${site}/c/${system.get(c.systemId) ?? ""}/${c.slug}` })),
    ...data.tiles.filter((t) => t.image).map((t) => ({ url: `${site}/p/${t.slug}` })),
    ...data.models.filter((m) => vehicleTiles(data, [m.id]).length >= VEHICLE_INDEX_MIN).map((m) => ({ url: `${site}/v/${m.brandSlug}/${m.slug}` })),
    ...[...new Set(data.models.map((m) => m.brandSlug))].filter((b) => vehicleTiles(data, data.models.filter((m) => m.brandSlug === b).map((m) => m.id)).length > 0).map((b) => ({ url: `${site}/v/${b}` })),
  ]
}
