import { writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import pg from "pg"
import { z } from "zod"
import { hasRetailTier, proposeRetailPaise } from "../lib/pricing"
import type { bodyStyle, fulfilment, qualityTier } from "../lib/schema"

export const legacyRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.coerce.number().positive(),
  category: z.string(),
  imageUrl: z.string().nullable(),
  images: z.array(z.string()),
  specs: z.string().nullable(),
  minimumQuantity: z.coerce.number().int().positive(),
  quantityType: z.string().nullable(),
  updatedAt: z.coerce.date(),
})
export type LegacyRow = z.infer<typeof legacyRowSchema>

type BodyStyle = (typeof bodyStyle.enumValues)[number]
type Fulfilment = (typeof fulfilment.enumValues)[number]
type QualityTier = (typeof qualityTier.enumValues)[number]

export const SYSTEMS = [
  { slug: "batteries-bms", name: "Batteries & BMS", shortName: "Batteries" },
  { slug: "electricals", name: "Controllers & electricals", shortName: "Electricals" },
  { slug: "connectors-charging", name: "Connectors & charging", shortName: "Connectors" },
  { slug: "lighting", name: "Lighting", shortName: "Lighting" },
  { slug: "dashboard", name: "Dashboard", shortName: "Dashboard" },
  { slug: "brakes-suspension", name: "Brakes, steering & suspension", shortName: "Brakes & suspension" },
  { slug: "body-frame", name: "Body & frame", shortName: "Body" },
  { slug: "locks-hardware", name: "Locks, hardware & small parts", shortName: "Locks & small parts" },
] as const
type SystemSlug = (typeof SYSTEMS)[number]["slug"]

export const CATEGORIES: { system: SystemSlug; slug: string; name: string; legacy: string[]; quoteShipping?: boolean }[] = [
  { system: "batteries-bms", slug: "battery-packs", name: "Battery packs", legacy: [] },
  { system: "batteries-bms", slug: "bms-48v", name: "48V BMS", legacy: ["48V LITHIUM BMS"] },
  { system: "batteries-bms", slug: "bms-60v", name: "60V BMS", legacy: ["60V LITHIUM BMS"] },
  { system: "batteries-bms", slug: "cells-holders", name: "Cells & holders", legacy: ["EV CELL & HOLDER"] },
  { system: "batteries-bms", slug: "battery-accessories", name: "Battery accessories", legacy: ["BATTERY ACCESSORIES"] },
  { system: "batteries-bms", slug: "heat-shrink-pvc", name: "Heat-shrink PVC", legacy: ["PVC"] },
  { system: "batteries-bms", slug: "insulation-board", name: "Insulation board", legacy: ["BOARD"] },
  { system: "electricals", slug: "controllers", name: "Controllers", legacy: ["CONTROLLER"] },
  { system: "electricals", slug: "converters", name: "Converters", legacy: ["CONVERTERS & TRANSVERTORS"] },
  { system: "electricals", slug: "throttles", name: "Throttles", legacy: ["THROTTLES"] },
  { system: "electricals", slug: "hall-sensor-plates", name: "Hall sensor plates", legacy: ["MOTORS & ACCESSORIES"] },
  { system: "electricals", slug: "handlebar-switches", name: "Handlebar switches", legacy: ["SWITCHES"] },
  { system: "electricals", slug: "flashers-mcbs-relays", name: "Flashers, MCBs & relays", legacy: ["FLASHER MCB & COUPLER"] },
  { system: "connectors-charging", slug: "sb50-connectors", name: "SB50 connectors", legacy: ["POWER CONNECTOR (SB 50)"] },
  { system: "connectors-charging", slug: "okinawa-connectors", name: "Okinawa connectors", legacy: ["POWER CONNECTOR (OKW)"] },
  { system: "connectors-charging", slug: "charging-cables-sockets", name: "Charging cables & sockets", legacy: ["POWER CHARGING CABLES"] },
  { system: "lighting", slug: "bulbs-holders", name: "Bulbs & holders", legacy: ["BULBS & LIGHTS"] },
  { system: "lighting", slug: "headlights", name: "Headlights", legacy: ["HEADLIGHT"] },
  { system: "dashboard", slug: "speedometers", name: "Speedometers", legacy: [] },
  { system: "dashboard", slug: "meter-glass-covers", name: "Meter glass covers", legacy: [] },
  { system: "brakes-suspension", slug: "front-forks-handle-tees", name: "Front forks & handle tees", legacy: ["FRONT SHOCKER & HANDLE TEE"], quoteShipping: true },
  { system: "brakes-suspension", slug: "rear-suspension", name: "Rear suspension", legacy: ["SUSPENSION REAR"] },
  { system: "brakes-suspension", slug: "bearings-ball-racers", name: "Bearings & ball racers", legacy: ["BALL RACER & BEARING"] },
  { system: "brakes-suspension", slug: "oil-seals", name: "Oil seals", legacy: ["OIL SEALS"] },
  { system: "brakes-suspension", slug: "brake-parts", name: "Brake parts", legacy: ["LINERS & BRAKE CABLES"] },
  { system: "body-frame", slug: "mudguards-panels", name: "Mudguards & panels", legacy: ["BODY PARTS", "MUDGUARD", "DL MODEL BODY PARTS", "SL MODEL BODY PARTS"], quoteShipping: true },
  { system: "body-frame", slug: "steel-guards", name: "Steel guards", legacy: ["STEEL GUARD"], quoteShipping: true },
  { system: "body-frame", slug: "footrests-backrests", name: "Footrests & backrests", legacy: ["FOOTRESTS & IRON PARTS"] },
  { system: "body-frame", slug: "mirrors", name: "Mirrors", legacy: ["MIRRORS"] },
  { system: "body-frame", slug: "mats-seat-covers", name: "Mats & seat covers", legacy: ["SEAT COVERS & MATS"] },
  { system: "locks-hardware", slug: "ignition-locks", name: "Ignition locks & sets", legacy: ["LOCK & REMOTE KITs"] },
  { system: "locks-hardware", slug: "nuts-bolts", name: "Nuts & bolts", legacy: ["NUT BOLTS"] },
  { system: "locks-hardware", slug: "small-parts", name: "Small parts", legacy: ["SMALL ITEMS", "OTHER ITEMS"] },
]

export function categoryFor(row: Pick<LegacyRow, "category" | "name">) {
  const name = row.name.toUpperCase()
  if (row.category === "SPEEDOMETER & GLASS COVER") return name.startsWith("GLASS COVER") ? "meter-glass-covers" : "speedometers"
  if (row.category === "OLA / AETHER ETC. PARTS") return name.includes("FOOTREST") ? "footrests-backrests" : "brake-parts"
  if (row.category === "HEADLIGHT" && name.includes("METER")) return "speedometers"
  if (row.category === "BULBS & LIGHTS" && /^(HEADLIGHT |LOADER FRONT LIGHT)/.test(name)) return "headlights"
  const found = CATEGORIES.find((c) => c.legacy.includes(row.category))
  if (!found) throw new Error(`Unmapped legacy category ${row.category}`)
  return found.slug
}

export function bodyStyleFor(row: Pick<LegacyRow, "category" | "name">): BodyStyle | null {
  const name = row.name.toUpperCase()
  if (row.category === "DL MODEL BODY PARTS" || /\bD\/?L MODE?L\b/.test(name)) return "dl_model"
  if (row.category === "SL MODEL BODY PARTS" || /\bSL MODEL\b/.test(name)) return "sl_model"
  if (/\b3 WHEELER\b/.test(name)) return "three_wheeler"
  if (/\bLOADER\b/.test(name)) return "loader"
  return null
}

const QUALITY: [RegExp, QualityTier][] = [
  [/\(HEAVY OEM\)/i, "oem"],
  [/\bORIGINAL\b/i, "original"],
  [/\(LOW QU(ALITY|LTY)\)/i, "economy"],
]

export function qualityFor(name: string): QualityTier | null {
  return QUALITY.find(([re]) => re.test(name))?.[1] ?? null
}

const KEEP_UPPER = new Set(["LED", "BMS", "NMC", "JBD", "MCB", "LCD", "IEC", "XLR", "PVC", "IG", "DL", "SL", "TVS", "QY", "PG", "AWG", "CYOK", "ECYL", "JANX", "DMEGC", "HC", "HD", "PLS", "TUNW", "RGT", "SRT", "FR", "MC", "ASSY", "MF", "ORV", "IF", "BRR", "BRJ", "LT", "IND", "LVR", "OKW", "ZP", "CAN", "H_IN", "L_M", "SB"])
const WORDS: Record<string, string> = {
  DALY: "Daly", TRUMP: "Trump", YUFENG: "Yufeng", WOBUT: "Wobut", BAOBAO: "Baobao", CALC: "Calc",
  OLA: "Ola", AETHER: "Ather", ATHER: "Ather", ATH: "Ather", OKINAWA: "Okinawa", PRAISE: "Praise", RIDGE: "Ridge",
  MAGNUS: "Magnus", AMPERE: "Ampere", HERO: "Hero", VSPA: "Vespa", VSP: "Vespa", VESPA: "Vespa", ORVA: "Orva",
  ERIK: "Erik", ICUB: "iQube", TSV: "TVS", OPTMA: "Optima", FLSH: "Flash", LITHUM: "lithium", TROTL: "throttle",
  MODL: "model", SML: "small", "CONT.": "controller", CONVERTOR: "converter", TRANSVERTOR: "transverter",
  QULTY: "quality", GOL: "gold", BLK: "black", "W/P": "waterproof", "D/L": "DL", CHINESE: "Chinese", MERC: "Merc",
  TIRANGA: "Tiranga", ULLU: "Ullu", JAALI: "jaali", PATTI: "patti", SINEWAVE: "sinewave", GENTS: "gents", LGT: "light",
}

function casePart(part: string) {
  if (!part) return part
  if (WORDS[part] !== undefined) return WORDS[part]
  if (/\d/.test(part) || KEEP_UPPER.has(part) || part.length === 1) return part
  return part.toLowerCase()
}

function caseToken(token: string) {
  const lead = /^[([]*/.exec(token)?.[0] ?? ""
  const trail = /[)\],]*$/.exec(token.slice(lead.length))?.[0] ?? ""
  const core = token.slice(lead.length, token.length - trail.length)
  const word = WORDS[core] ?? core.split(/([-/+])/).map((p) => (/^[-/+]$/.test(p) ? p : casePart(p))).join("")
  return lead + word + trail
}

export function cleanName(legacyName: string) {
  let s = legacyName.toUpperCase()
  s = s.replace(/\(OUT OF STOCK\)/g, " ")
  for (const [re] of QUALITY) s = s.replace(new RegExp(re.source, "gi"), " ")
  s = s.replace(/\[\s*/g, "").replace(/\s*\]/g, "").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/\(\)/g, " ")
  s = s.replace(/\s+/g, " ").trim()
  const words = s.split(" ").map(caseToken).join(" ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function partCodeFor(legacyName: string) {
  const name = legacyName.toUpperCase()
  const bms = /\b\d{2}S \d{2,3}A\b/.exec(name)
  if (bms) return bms[0]
  const bracket = [...name.matchAll(/\[([^\]]+)\]/g)].map((m) => (m[1] ?? "").trim()).find((b) => /\d/.test(b))
  if (bracket) return bracket.replace(/\s+/g, " ")
  const bearing = /\b6\d{3}( 2RS)?\b/.exec(name)
  if (bearing) return bearing[0]
  if (/\bSB ?50\b/.test(name)) return "SB50"
  return null
}

const MAKERS = ["Daly", "JBD", "DMEGC", "Yufeng", "JANX", "Wobut", "ECYL", "CYOK", "Trump", "Baobao", "Calc"]
export function makerFor(legacyName: string) {
  return MAKERS.find((m) => new RegExp(`\\b${m}\\b`, "i").test(legacyName)) ?? null
}

export const VEHICLES = [
  { brand: "Okinawa", brandSlug: "okinawa", model: "Praise", modelSlug: "praise", aliases: "praise okw" },
  { brand: "Okinawa", brandSlug: "okinawa", model: "Ridge", modelSlug: "ridge", aliases: "ridge okw" },
  { brand: "Ola", brandSlug: "ola", model: "S1", modelSlug: "s1", aliases: "s1 pro s1 air s1x" },
  { brand: "Ather", brandSlug: "ather", model: "450", modelSlug: "450", aliases: "450x 450s 450 plus aether" },
  { brand: "Ampere", brandSlug: "ampere", model: "Magnus", modelSlug: "magnus", aliases: "magnus mgns" },
  { brand: "TVS", brandSlug: "tvs", model: "iQube", modelSlug: "iqube", aliases: "iqube icub" },
  { brand: "Hero Electric", brandSlug: "hero-electric", model: "Optima", modelSlug: "optima", aliases: "optima optma" },
  { brand: "Vespa-style", brandSlug: "vespa-style", model: "Vespa-style scooter", modelSlug: "scooter", aliases: "vespa vsp vspa" },
] as const

export function vehiclesFor(legacyName: string) {
  const n = legacyName.toUpperCase()
  const out = new Set<string>()
  if (/\bPRAISE\b/.test(n)) out.add("okinawa/praise")
  else if (/\b(OKINAWA|OKW)\b/.test(n)) {
    out.add("okinawa/praise")
    out.add("okinawa/ridge")
  }
  if (/\bOLA\b|\bS1\b/.test(n)) out.add("ola/s1")
  if (/\b(AETHER|ATHER|ATH)\b/.test(n)) out.add("ather/450")
  if (/\b(MAGNUS|MGNS)\b/.test(n)) out.add("ampere/magnus")
  if (/\b(ICUB|IQUBE)\b/.test(n)) out.add("tvs/iqube")
  if (/\b(OPTMA|OPTIMA)\b/.test(n)) out.add("hero-electric/optima")
  if (/\b(VSP|VSPA|VESPA)\b/.test(n)) out.add("vespa-style/scooter")
  return [...out]
}

const SPEC_KEYS: Record<string, string> = {
  Voltag: "Voltage", Shap: "Shape", Colo: "Colour", Color: "Colour", "Water Resistanc": "Water resistance",
  Compatiblity: "Compatibility", "Socket Type: 2-Pin or 3-Pin": "Socket type", "Sensor Configuration:": "Sensor configuration",
}
const SPEC_VALUES: [RegExp, string][] = [[/Igniton/g, "Ignition"], [/Swtich/g, "Switch"]]

export function cleanSpecs(raw: string | null) {
  const flags: string[] = []
  let parsed: unknown = {}
  try {
    parsed = JSON.parse(raw ?? "{}")
  } catch {
    flags.push("specs were not valid JSON and were dropped")
  }
  const out: Record<string, string> = {}
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [rawKey, rawValue] of Object.entries(parsed)) {
      const keyIn = rawKey.trim()
      const key = SPEC_KEYS[keyIn] ?? keyIn
      let value = (typeof rawValue === "string" ? rawValue : typeof rawValue === "number" ? String(rawValue) : "").trim()
      for (const [re, to] of SPEC_VALUES) value = value.replace(re, to)
      if (!key || !value) continue
      if (key === "Compatibility" && /^universal$/i.test(value)) continue
      if (key.length > 60 || value.length > 200) {
        flags.push(`spec "${key.slice(0, 40)}" too long, dropped`)
        continue
      }
      out[key] = value
    }
  }
  return { specs: out, flags }
}

const CLEARED_COPY = ["CONTROLLER 48-72V+35A SINEWAVE BLK", "CONTROLLER 48-72V+35A SINEWAVE WHITE", "HOLDER [BACKLIGHT]", "IG [L3 OPTMA+2D] (BLK) (HERO LOCK)", "THROTTLE [GREEN ONE COUPLER]", "CELL HOLDER 18650(8X15)"]
export function descriptionFor(row: Pick<LegacyRow, "name" | "description">) {
  const text = (row.description ?? "").replace(/\r\n/g, "\n").trim()
  if (!text) return { description: "", cleared: false }
  if (CLEARED_COPY.includes(row.name.trim().toUpperCase())) return { description: "", cleared: true }
  return { description: text, cleared: false }
}

export function slugify(name: string) {
  const s = name
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return s.slice(0, 70).replace(/-+$/, "")
}

export function publicIdFor(url: string) {
  const prefix = "https://res.cloudinary.com/dbmblxf0a/image/upload/"
  if (!url.startsWith(prefix)) return null
  const path = url.slice(prefix.length).replace(/^v\d+\//, "")
  return path.replace(/\.[a-z0-9]+$/i, "")
}

const UNITS: Record<string, string> = { PCS: "pcs", SET: "set", KG: "kg" }

export function dedupeKey(name: string) {
  return name.toUpperCase().replace(/\s+/g, " ").trim()
}

function richness(r: LegacyRow) {
  return (r.imageUrl ? 1 : 0) + r.images.length + (r.description?.length ?? 0) / 1000 + Object.keys(cleanSpecs(r.specs).specs).length / 100
}

export type Planned = {
  legacyId: string
  mergedLegacyIds: string[]
  legacyName: string
  name: string
  slug: string
  sku: string
  partCode: string | null
  maker: string | null
  category: string
  bodyStyle: BodyStyle | null
  qualityTier: QualityTier | null
  description: string
  specs: Record<string, string>
  unit: string
  moq: number
  minOrderQty: number
  orderStep: number
  wholesalePaise: number
  proposedRetailPaise: number | null
  stock: number | null
  fulfilment: Fulfilment
  batteryKind: "none" | "cell"
  groupKey: string | null
  variantLabel: string | null
  status: "active" | "draft"
  images: string[]
  vehicles: string[]
  flags: string[]
}

export function plan(rows: LegacyRow[]) {
  const groups = new Map<string, LegacyRow[]>()
  for (const r of rows) {
    const key = dedupeKey(r.name)
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const merges: string[] = []
  const planned: Omit<Planned, "sku" | "slug">[] = []
  for (const group of groups.values()) {
    const [first] = group
    if (!first) continue
    const sameTerms = group.every((r) => r.price === first.price && r.minimumQuantity === first.minimumQuantity && r.quantityType === first.quantityType)
    const kept = sameTerms ? [[...group].sort((a, b) => richness(b) - richness(a))[0] as LegacyRow] : group
    if (group.length > 1 && sameTerms) merges.push(`${first.name.trim()} (${group.length} rows merged)`)
    for (const r of kept) {
      const flags: string[] = []
      const mergedFrom = sameTerms ? group.filter((g) => g.id !== r.id) : []
      const imageUrls = [...new Set([...(r.imageUrl ? [r.imageUrl] : []), ...r.images, ...mergedFrom.flatMap((m) => [...(m.imageUrl ? [m.imageUrl] : []), ...m.images])])]
      const images = imageUrls.map(publicIdFor).filter((p): p is string => {
        if (p === null) flags.push("image outside the allowed Cloudinary folder dropped")
        return p !== null
      })
      const { specs, flags: specFlags } = cleanSpecs(r.specs)
      flags.push(...specFlags)
      const { description, cleared } = descriptionFor(r)
      if (cleared) flags.push("description cleared: it described a different product")
      if (group.length > 1 && !sameTerms) flags.push("same name as another row with different price, minimum or unit: left as draft")
      if (r.updatedAt > new Date("2026-03-03T00:00:00Z")) flags.push("edited on the old admin after 3 Mar 2026: check the data")
      const unit = r.quantityType ? UNITS[r.quantityType.toUpperCase()] : undefined
      if (!unit) flags.push(`unit ${r.quantityType ?? "missing"} mapped to pcs`)
      const isCell = /\bLITHU?M?-?ION CELL\b|\bCELL \d{4}MAH\b/i.test(r.name)
      const moq = r.minimumQuantity
      const minOrderQty = isCell ? moq : 1
      const orderStep = isCell ? moq : 1
      if (isCell) flags.push("cell pack size: name says pack of 200, minimum is 100; owner to confirm")
      const wholesalePaise = Math.round(r.price * 100)
      if (r.quantityType?.toUpperCase() === "KG" && wholesalePaise > 100000) flags.push("priced per kg at more than ₹1,000: confirm whether the price is per roll")
      const proposedRetailPaise = hasRetailTier({ moq, minOrderQty }) ? proposeRetailPaise(wholesalePaise) : null
      const legacyUpper = r.name.toUpperCase()
      const sinewave = /SINEWAVE (BLK|RED|WHITE)/.exec(legacyUpper)
      const groupKey = sinewave && legacyUpper.startsWith("CONTROLLER 48-72V+35A") ? "controller-48-72v-35a-sinewave" : null
      const variantLabel = sinewave && groupKey ? ({ BLK: "Black", RED: "Red", WHITE: "White" } as const)[sinewave[1] as "BLK" | "RED" | "WHITE"] : null
      if (legacyUpper.startsWith("CONT. 48-72V+35A SINEWAVE")) flags.push("looks like the sinewave controller with a minimum of 2: confirm whether it is a separate product")
      planned.push({
        legacyId: r.id,
        mergedLegacyIds: mergedFrom.map((m) => m.id),
        legacyName: r.name,
        name: cleanName(r.name),
        partCode: partCodeFor(r.name),
        maker: makerFor(r.name),
        category: categoryFor(r),
        bodyStyle: bodyStyleFor(r),
        qualityTier: qualityFor(r.name),
        description,
        specs,
        unit: unit ?? "pcs",
        moq,
        minOrderQty,
        orderStep,
        wholesalePaise,
        proposedRetailPaise,
        stock: /\(OUT OF STOCK\)/i.test(r.name) ? 0 : null,
        fulfilment: isCell ? "pickup_or_freight" : "courier",
        batteryKind: isCell ? "cell" : "none",
        groupKey,
        variantLabel,
        status: group.length > 1 && !sameTerms ? "draft" : "active",
        images,
        vehicles: vehiclesFor(r.name),
        flags,
      })
    }
  }
  const systemOrder = new Map<string, number>(SYSTEMS.map((s, i) => [s.slug, i]))
  const catOrder = new Map(CATEGORIES.map((c, i) => [c.slug, { i, system: c.system }]))
  planned.sort((a, b) => {
    const ca = catOrder.get(a.category)
    const cb = catOrder.get(b.category)
    return (systemOrder.get(ca?.system ?? "") ?? 0) - (systemOrder.get(cb?.system ?? "") ?? 0) || (ca?.i ?? 0) - (cb?.i ?? 0) || a.name.localeCompare(b.name)
  })
  const slugs = new Set<string>()
  const products: Planned[] = planned.map((p, i) => {
    const base = slugify(p.name) || "part"
    let slug = base
    for (let n = 2; slugs.has(slug); n++) slug = `${base.slice(0, 66)}-${n}`
    slugs.add(slug)
    return { ...p, slug, sku: `WSG-${String(i + 1).padStart(5, "0")}` }
  })
  const accounted = products.length + products.reduce((n, p) => n + p.mergedLegacyIds.length, 0)
  return { products, merges, accounted }
}

async function imageSize(publicId: string, attempt = 1): Promise<{ width: number; height: number }> {
  try {
    const res = await fetch(`https://res.cloudinary.com/dbmblxf0a/image/upload/fl_getinfo/${publicId}`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`Cloudinary getinfo ${res.status} for ${publicId}`)
    return z.object({ input: z.object({ width: z.number().int(), height: z.number().int() }) }).parse(await res.json()).input
  } catch (error) {
    if (attempt >= 3) throw error
    return imageSize(publicId, attempt + 1)
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = []
  let next = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i] as T)
      }
    }),
  )
  return out
}

function report(result: ReturnType<typeof plan>, total: number, skipped: string[]) {
  const lines = [`# Legacy migration report`, "", `${total} legacy rows → ${result.products.length} products (${total - result.products.length} merged).`, ""]
  lines.push("## Merged duplicates", ...result.merges.map((m) => `- ${m}`), "")
  if (skipped.length) lines.push("## Skipped (edited in the new admin since the last migration)", ...skipped.map((s) => `- ${s}`), "")
  lines.push("## Products", "", "| SKU | Old name | New name | Category | Code | Maker | Wholesale | Break | Proposed retail | Flags |", "|---|---|---|---|---|---|---|---|---|---|")
  for (const p of result.products) {
    const rupees = (paise: number | null) => (paise === null ? "" : `₹${(paise / 100).toLocaleString("en-IN")}`)
    lines.push(`| ${p.sku} | ${p.legacyName.trim()} | ${p.name} | ${p.category} | ${p.partCode ?? ""} | ${p.maker ?? ""} | ${rupees(p.wholesalePaise)} | ${p.moq} | ${rupees(p.proposedRetailPaise)} | ${p.flags.join("; ")} |`)
  }
  return lines.join("\n") + "\n"
}

async function main() {
  const { values } = parseArgs({ options: { commit: { type: "boolean", default: false }, report: { type: "string", default: "migration-report.md" } } })
  const env = z.object({ DATABASE_URL: z.url(), LEGACY_DATABASE_URL_READONLY: z.url() }).parse(process.env)

  const legacy = new pg.Client({ connectionString: env.LEGACY_DATABASE_URL_READONLY })
  await legacy.connect()
  await legacy.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
  const legacyRows = await legacy.query(`select id, name, description, price, category, "imageUrl", images, specs, "minimumQuantity", "quantityType", "updatedAt" from "Product" order by "createdAt"`)
  await legacy.end()
  const rows = z.array(legacyRowSchema).parse(legacyRows.rows)

  const result = plan(rows)
  if (result.accounted !== rows.length) throw new Error(`Accounted ${result.accounted} of ${rows.length} legacy rows`)

  const db = new pg.Client({ connectionString: env.DATABASE_URL })
  await db.connect()
  const { rows: withImages } = await db.query<{ legacy_id: string }>(`select distinct p.legacy_id from product p join product_image i on i.product_id = p.id where p.legacy_id is not null`)
  const hasImages = new Set(withImages.map((r) => r.legacy_id))
  const publicIds = [...new Set(result.products.filter((p) => !hasImages.has(p.legacyId)).flatMap((p) => p.images))]
  const sizes = new Map(await mapLimit(publicIds, 8, async (id) => [id, await imageSize(id)] as const))
  const skipped: string[] = []
  try {
    await db.query("BEGIN")
    const systemIds = new Map<string, number>()
    for (const [position, s] of SYSTEMS.entries()) {
      const { rows: r } = await db.query<{ id: number }>(
        `insert into system (slug, name, short_name, position) values ($1, $2, $3, $4)
         on conflict (slug) do update set name = excluded.name, short_name = excluded.short_name, position = excluded.position returning id`,
        [s.slug, s.name, s.shortName, position + 1],
      )
      systemIds.set(s.slug, r[0]?.id ?? 0)
    }
    const categoryIds = new Map<string, number>()
    for (const [position, c] of CATEGORIES.entries()) {
      const { rows: r } = await db.query<{ id: number }>(
        `insert into category (system_id, slug, name, position, quote_shipping, legacy_name) values ($1, $2, $3, $4, $5, $6)
         on conflict (system_id, slug) do update set name = excluded.name, position = excluded.position, quote_shipping = excluded.quote_shipping, legacy_name = excluded.legacy_name returning id`,
        [systemIds.get(c.system), c.slug, c.name, position + 1, c.quoteShipping ?? false, c.legacy.join(", ") || null],
      )
      categoryIds.set(c.slug, r[0]?.id ?? 0)
    }
    const modelIds = new Map<string, number>()
    for (const v of VEHICLES) {
      const { rows: b } = await db.query<{ id: number }>(`insert into vehicle_brand (slug, name) values ($1, $2) on conflict (slug) do update set name = excluded.name returning id`, [v.brandSlug, v.brand])
      const { rows: m } = await db.query<{ id: number }>(
        `insert into vehicle_model (brand_id, slug, name, aliases) values ($1, $2, $3, $4) on conflict (brand_id, slug) do update set name = excluded.name, aliases = excluded.aliases returning id`,
        [b[0]?.id, v.modelSlug, v.model, v.aliases],
      )
      modelIds.set(`${v.brandSlug}/${v.modelSlug}`, m[0]?.id ?? 0)
    }

    for (const p of result.products) {
      const existing = await db.query<{ id: number; edited: boolean }>(`select id, updated_at > migrated_at + interval '1 second' as edited from product where legacy_id = $1`, [p.legacyId])
      const prior = existing.rows[0]
      if (prior?.edited) {
        skipped.push(`${p.sku} ${p.name}`)
        continue
      }
      const params = [
        p.slug, p.sku, p.partCode, p.name, p.maker, p.batteryKind, p.bodyStyle, p.groupKey, p.variantLabel, categoryIds.get(p.category), p.status,
        p.qualityTier, p.description, JSON.stringify(p.specs), p.unit, p.moq, p.minOrderQty, p.orderStep, p.wholesalePaise, p.proposedRetailPaise,
        p.stock, p.fulfilment, p.legacyId, p.legacyName,
      ]
      const { rows: saved } = prior
        ? await db.query<{ id: number }>(
            `update product set slug = coalesce(slug, $1), sku = coalesce(sku, $2), part_code = $3, name = $4, maker = $5, battery_kind = $6, body_style = $7, group_key = $8, variant_label = $9,
               category_id = $10, status = $11, quality_tier = $12, description = $13, specs = $14, unit = $15, moq = $16, min_order_qty = $17, order_step = $18,
               wholesale_paise = $19, proposed_retail_paise = $20, stock = $21, fulfilment = $22, legacy_name = $24, migrated_at = now(), updated_at = now()
             where legacy_id = $23 returning id`,
            params,
          )
        : await db.query<{ id: number }>(
            `insert into product (slug, sku, part_code, name, maker, battery_kind, body_style, group_key, variant_label, category_id, status, quality_tier, description, specs,
               unit, moq, min_order_qty, order_step, wholesale_paise, proposed_retail_paise, stock, fulfilment, legacy_id, legacy_name, migrated_at, updated_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, now(), now()) returning id`,
            params,
          )
      const productId = saved[0]?.id
      if (!productId) throw new Error(`No id for ${p.legacyId}`)
      if (!prior) {
        await db.query(`insert into price_history (product_id, retail_paise, wholesale_paise) values ($1, null, $2)`, [productId, p.wholesalePaise])
        if (p.stock === 0) await db.query(`insert into stock_movement (product_id, delta, reason, note) values ($1, 0, 'count', 'Marked out of stock on the old site')`, [productId])
      }
      const imageCount = await db.query<{ n: number }>(`select count(*)::int as n from product_image where product_id = $1`, [productId])
      if ((imageCount.rows[0]?.n ?? 0) === 0) {
        for (const [position, publicId] of p.images.entries()) {
          const size = sizes.get(publicId)
          await db.query(`insert into product_image (product_id, public_id, width, height, alt, position) values ($1, $2, $3, $4, $5, $6)`, [productId, publicId, size?.width, size?.height, p.name, position])
        }
      }
      for (const key of p.vehicles) {
        await db.query(`insert into product_vehicle (product_id, model_id, verified) values ($1, $2, false) on conflict do nothing`, [productId, modelIds.get(key)])
      }
    }
    await db.query(values.commit ? "COMMIT" : "ROLLBACK")
  } catch (error) {
    await db.query("ROLLBACK")
    throw error
  } finally {
    await db.end()
  }
  writeFileSync(values.report, report(result, rows.length, skipped))
  console.info(`${values.commit ? "Committed" : "Dry run (rolled back)"}: ${rows.length} legacy rows, ${result.products.length} products, ${publicIds.length} images fetched, ${skipped.length} skipped. Report: ${values.report}`)
}

if (import.meta.main) await main()
