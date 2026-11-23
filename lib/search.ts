import type { Catalog } from "./storefront"

export type Searchable = { code: string | null; name: string; terms: string; context: string; image: unknown; purchasable: boolean; stock: { kind: string } }

const WORDS: Record<string, string> = {
  accelerator: "throttle",
  accelator: "throttle",
  excelator: "throttle",
  shocker: "shock",
  dikki: "lock",
  chabi: "lock",
  key: "lock",
  break: "brake",
  brek: "brake",
  brk: "brake",
  disk: "disc",
  controler: "controller",
  contoller: "controller",
  convertor: "converter",
  transverter: "converter",
  indicater: "indicator",
  blinker: "indicator",
  tire: "tyre",
  बैटरी: "battery",
  ब्रेक: "brake",
  पैड: "pad",
  लाइट: "light",
  हॉर्न: "horn",
  मीटर: "speedometer",
  कंट्रोलर: "controller",
  चार्जर: "charger",
  ताला: "lock",
}

export function normalise(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[\s\-./[\]()]/g, "")
}

export function codeMissing(name: string, code: string | null): code is string {
  const words = name.split(/[^\p{L}\p{N}]+/u).map(normalise)
  return code !== null && !code.split(/[^\p{L}\p{N}]+/u).filter(Boolean).every((t) => words.includes(normalise(t)))
}

const VOLTS = [36, 48, 60, 64, 72, 84, 96]

function expand(word: string) {
  const list = /^(\d+(?:\/\d+)+)([a-z]+)$/.exec(word)
  if (list?.[1] && list[2]) {
    const unit = list[2]
    return [word, ...list[1].split("/").map((n) => `${n}${unit}`)]
  }
  const range = /^(\d+)-(\d+)v$/.exec(word)
  if (range) {
    const lo = Number(range[1])
    const hi = Number(range[2])
    return [word, ...VOLTS.filter((v) => v >= lo && v <= hi).map((v) => `${String(v)}v`)]
  }
  return [word]
}

export function searchTerms(parts: readonly (string | null | undefined)[]) {
  const words = parts
    .flatMap((p) => (p ? p.toLowerCase().split(/[\s,;:]+/) : []))
    .flatMap(expand)
    .map(normalise)
    .filter((w) => w.length > 0)
  return [...new Set(words.flatMap((w) => [w, stem(w)]))].join(" ")
}

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min((d[i - 1]?.[j] ?? 0) + 1, (d[i]?.[j - 1] ?? 0) + 1, (d[i - 1]?.[j - 1] ?? 0) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (d[i - 2]?.[j - 2] ?? 0) + 1)
      const row = d[i]
      if (row) row[j] = v
    }
  }
  return d[a.length]?.[b.length] ?? 0
}

export function stem(word: string) {
  return word.length > 4 && word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word
}

function queryWords(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => WORDS[w] ?? WORDS[stem(w)] ?? stem(w))
}

export function matchesName(name: string, query: string) {
  const tokens = queryWords(query).map((w) => stem(normalise(w))).filter((t) => t.length >= 2)
  const words = name.split(/[\s,&/()]+/).map((w) => stem(normalise(w))).filter((w) => w.length > 0)
  return tokens.length > 0 && tokens.every((t) => words.some((w) => w.startsWith(t) || (t.length >= 5 && distance(w, t) <= 1)))
}

function score(item: Searchable, q: string, tokens: readonly string[]) {
  const code = item.code ? normalise(item.code) : ""
  if (code && code === q) return 100
  if (code && code.startsWith(q)) return 80
  if (normalise(item.name).startsWith(q)) return 60
  if (tokens.every((t) => item.terms.includes(t))) return 40
  if (q.length >= 5) {
    const limit = q.length >= 8 ? 2 : 1
    const words = [code, ...item.name.split(/\s+/).map(normalise)].filter((w) => w.length > 0)
    if (words.some((w) => Math.abs(w.length - q.length) <= limit && distance(w, q) <= limit)) return 30
    if (tokens.length > 1 && tokens.every((t) => item.terms.split(" ").some((w) => w.startsWith(t) || (t.length >= 5 && distance(w, t) <= 1)))) return 25
  }
  if (tokens.every((t) => item.context.includes(t) || item.terms.includes(t))) return 20
  const hits = tokens.filter((t) => t.length >= 3 && (item.terms.includes(t) || item.context.includes(t))).length
  return tokens.length > 1 && hits * 2 >= tokens.length ? 5 : 0
}

export const EXACT = 80

export function searchScored<T extends Searchable>(items: readonly T[], query: string, limit = Infinity): { item: T; s: number }[] {
  const words = queryWords(query)
  const q = normalise(words.join(""))
  if (q.length < 2) return []
  const tokens = words.map(normalise).filter((t) => t.length > 0)
  const scored = items.map((item) => ({ item, s: score(item, q, tokens) })).filter((r) => r.s > 0)
  const strong = scored.some((r) => r.s > 5)
  return scored
    .filter((r) => !strong || r.s > 5)
    .sort(
      (a, b) =>
        b.s - a.s ||
        Number(b.item.image !== null) - Number(a.item.image !== null) ||
        Number(b.item.purchasable) - Number(a.item.purchasable) ||
        Number(a.item.stock.kind === "out") - Number(b.item.stock.kind === "out") ||
        a.item.name.localeCompare(b.item.name),
    )
    .slice(0, limit)
}

export function searchProducts<T extends Searchable>(items: readonly T[], query: string, limit = Infinity): T[] {
  return searchScored(items, query, limit).map((r) => r.item)
}

export type Shortcut = { href: string; label: string; count: number }

export function shortcuts(data: Catalog, query: string, limit = 3): Shortcut[] {
  const label = (m: Catalog["models"][number]) => (m.name.toLowerCase().startsWith(m.brandName.toLowerCase()) ? m.name : `${m.brandName} ${m.name}`)
  const vehicles = data.models
    .filter((m) => matchesName(`${label(m)} ${m.brandSlug}`, query))
    .map((m) => ({ href: `/v/${m.brandSlug}/${m.slug}`, label: `Parts for ${label(m)}`, count: data.tiles.filter((t) => t.vehicles.some((v) => v.modelId === m.id)).length }))
  const systemSlug = new Map(data.systems.map((x) => [x.id, x.slug]))
  const categories = data.categories
    .filter((c) => c.count > 0 && matchesName(c.name, query))
    .map((c) => ({ href: `/c/${systemSlug.get(c.systemId) ?? ""}/${c.slug}`, label: c.name, count: c.count }))
  const systems = data.systems.filter((x) => x.count > 0 && matchesName(x.name, query)).map((x) => ({ href: `/c/${x.slug}`, label: x.name, count: x.count }))
  return [...vehicles, ...systems, ...categories].filter((x) => x.count > 0).slice(0, limit)
}
