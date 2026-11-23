import { listingPrice } from "./pricing"
import type { bodyStyle } from "./schema"

export type BodyStyle = (typeof bodyStyle.enumValues)[number]
export const BODY_STYLES = ["dl_model", "sl_model", "loader", "three_wheeler"] as const satisfies readonly BodyStyle[]
export const BODY_LABELS: Record<BodyStyle, string> = { dl_model: "DL model", sl_model: "SL model", loader: "Loader", three_wheeler: "3-wheeler" }
export const SORTS = ["recommended", "price-asc", "price-desc", "code"] as const
export type Sort = (typeof SORTS)[number]
export const SORT_LABELS: Record<Sort, string> = { recommended: "Recommended", "price-asc": "Price, low to high", "price-desc": "Price, high to low", code: "Code, A to Z" }

export type Filterable = {
  code: string | null
  name: string
  priced: Parameters<typeof listingPrice>[0]
  purchasable: boolean
  image: unknown
  stock: { kind: string }
  bodyStyle: BodyStyle | null
  vehicles: readonly { modelId: number }[]
  facets: readonly (readonly [string, string])[]
}

export const FACET_KEYS = ["Maker", "Series cells", "Voltage", "Current", "Position"] as const
export const facetKey = (key: string, value: string) => `${key}=${value}`

export type ListingFilter = { vehicle: number | null; body: BodyStyle | null; stock: boolean; specs: readonly string[]; sort: Sort }

export function matches(t: Filterable, f: Omit<ListingFilter, "sort">) {
  if (f.vehicle !== null && !t.vehicles.some((v) => v.modelId === f.vehicle)) return false
  if (f.body !== null && t.bodyStyle !== f.body) return false
  if (f.stock && t.stock.kind === "out") return false
  const wanted = new Map<string, string[]>()
  for (const s of f.specs) {
    const key = s.slice(0, s.indexOf("="))
    wanted.set(key, [...(wanted.get(key) ?? []), s])
  }
  for (const options of wanted.values()) if (!t.facets.some(([k, v]) => options.includes(facetKey(k, v)))) return false
  return true
}

export function applyFilter<T extends Filterable>(items: readonly T[], f: ListingFilter): T[] {
  const kept = items.filter((t) => matches(t, f))
  if (f.sort === "recommended") {
    return kept
      .map((t, i) => ({ t, i }))
      .sort((a, b) => Number(b.t.image !== null) - Number(a.t.image !== null) || Number(b.t.purchasable) - Number(a.t.purchasable) || Number(a.t.stock.kind === "out") - Number(b.t.stock.kind === "out") || a.i - b.i)
      .map((r) => r.t)
  }
  if (f.sort === "code") return [...kept].sort((a, b) => (a.code ?? a.name).localeCompare(b.code ?? b.name, "en", { numeric: true }))
  const dir = f.sort === "price-asc" ? 1 : -1
  return [...kept].sort((a, b) => dir * (listingPrice(a.priced).paise - listingPrice(b.priced).paise))
}

export function facetCounts(items: readonly Filterable[], f: ListingFilter) {
  const vehicles = new Map<number, number>()
  const bodies = new Map<BodyStyle, number>()
  const specs = new Map<string, Map<string, number>>()
  let inStock = 0
  for (const t of items) {
    for (const [k, v] of t.facets) {
      if (!matches(t, { ...f, specs: f.specs.filter((s) => !s.startsWith(`${k}=`)) })) continue
      const values = specs.get(k) ?? new Map<string, number>()
      values.set(v, (values.get(v) ?? 0) + 1)
      specs.set(k, values)
    }
    if (matches(t, { ...f, vehicle: null })) for (const v of t.vehicles) vehicles.set(v.modelId, (vehicles.get(v.modelId) ?? 0) + 1)
    if (t.bodyStyle && matches(t, { ...f, body: null })) bodies.set(t.bodyStyle, (bodies.get(t.bodyStyle) ?? 0) + 1)
    if (t.stock.kind !== "out" && matches(t, { ...f, stock: false })) inStock++
  }
  return { vehicles, bodies, specs, inStock, total: items.filter((t) => matches(t, f)).length }
}
