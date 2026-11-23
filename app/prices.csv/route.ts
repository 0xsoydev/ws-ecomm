import { hasRetailTier, minQty } from "@/lib/pricing"
import { catalog } from "@/lib/storefront"

function cell(value: string | number) {
  const text = String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function GET() {
  const { tiles, systems } = await catalog()
  const system = new Map(systems.map((s) => [s.slug, s.name]))
  const rows = tiles.map((t) => [
      t.code ?? "",
      t.name,
      system.get(t.systemSlug) ?? "",
      t.unit,
      minQty(t.priced),
      t.priced.retailPaise !== null && hasRetailTier(t.priced) ? (t.priced.retailPaise / 100).toFixed(2) : "",
      (t.priced.wholesalePaise / 100).toFixed(2),
      t.priced.moq,
      t.stock.kind === "out" ? "out of stock" : "ask",
      t.purchasable ? "online" : "at the shop",
    ])
  const header = ["code", "name", "system", "unit", "minimum", "retail_inr", "wholesale_inr", "wholesale_from", "stock", "buy"]
  const body = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n")
  return new Response(`${body}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'inline; filename="ws-green-prices.csv"' } })
}
