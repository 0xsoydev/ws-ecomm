import type { Catalog } from "./storefront"

export const LOGOS = new Set(["ola", "ather", "tvs", "bajaj", "hero-vida", "ampere", "okinawa", "hero-electric", "komaki", "pure-ev", "bgauss", "revolt"])

export type BrandTile = { slug: string; name: string; count: number; logo: boolean }

export function brandTiles(data: Pick<Catalog, "models" | "tiles">): BrandTile[] {
  const brands = new Map<string, { name: string; ids: Set<number> }>()
  for (const m of data.models) {
    const b = brands.get(m.brandSlug) ?? { name: m.brandName, ids: new Set<number>() }
    b.ids.add(m.id)
    brands.set(m.brandSlug, b)
  }
  return [...brands.entries()]
    .map(([slug, b]) => ({ slug, name: b.name, logo: LOGOS.has(slug), count: data.tiles.filter((t) => t.vehicles.some((v) => b.ids.has(v.modelId))).length }))
    .filter((b) => b.logo)
    .sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || [...LOGOS].indexOf(a.slug) - [...LOGOS].indexOf(b.slug))
}
