export type Searchable = { code: string | null; name: string; terms: string; image: unknown; purchasable: boolean; stock: { kind: string } }

const WORDS: Record<string, string> = {
  accelerator: "throttle",
  meter: "speedometer",
  shocker: "shock",
  dikki: "lock",
  बैटरी: "battery",
  ब्रेक: "brake",
  लाइट: "light",
  हॉर्न: "horn",
}

export function normalise(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[\s\-./[\]()]/g, "")
}

export function searchTerms(parts: readonly (string | null | undefined)[]) {
  return parts
    .flatMap((p) => (p ? p.split(/[\s,;:]+/) : []))
    .map(normalise)
    .filter((w) => w.length > 0)
    .join(" ")
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0] ?? 0
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j] ?? 0
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = temp
    }
  }
  return row[b.length] ?? 0
}

function score(item: Searchable, q: string, tokens: readonly string[]) {
  const code = item.code ? normalise(item.code) : ""
  if (code && code === q) return 100
  if (code && code.startsWith(q)) return 80
  if (normalise(item.name).startsWith(q)) return 60
  if (tokens.every((t) => item.terms.includes(t))) return 40
  if (q.length >= 4) {
    const limit = q.length >= 8 ? 2 : 1
    const words = [code, ...item.name.split(/\s+/).map(normalise)].filter((w) => w.length > 0)
    if (words.some((w) => Math.abs(w.length - q.length) <= limit && distance(w, q) <= limit)) return 30
    if (tokens.length > 1 && tokens.every((t) => item.terms.split(" ").some((w) => w.startsWith(t) || (t.length >= 4 && distance(w, t) <= 1)))) return 25
  }
  return 0
}

export function searchProducts<T extends Searchable>(items: readonly T[], query: string, limit = Infinity): T[] {
  const words = query
    .trim()
    .split(/\s+/)
    .map((w) => WORDS[w.toLowerCase()] ?? w)
  const q = normalise(words.join(""))
  if (q.length < 2) return []
  const tokens = words.map(normalise).filter((t) => t.length > 0)
  return items
    .map((item) => ({ item, s: score(item, q, tokens) }))
    .filter((r) => r.s > 0)
    .sort(
      (a, b) =>
        b.s - a.s ||
        Number(b.item.image !== null) - Number(a.item.image !== null) ||
        Number(b.item.purchasable) - Number(a.item.purchasable) ||
        Number(a.item.stock.kind === "out") - Number(b.item.stock.kind === "out") ||
        a.item.name.localeCompare(b.item.name),
    )
    .slice(0, limit)
    .map((r) => r.item)
}
