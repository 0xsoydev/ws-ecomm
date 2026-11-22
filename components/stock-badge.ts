import type { Tile } from "@/lib/storefront"

export function stockBadge(tile: Pick<Tile, "stock" | "pickupOnly">) {
  if (tile.stock.kind === "out") return { text: "Out of stock", tone: "muted" as const }
  if (tile.pickupOnly) return { text: "Pickup only", tone: "ink" as const }
  if (tile.stock.kind === "low") return { text: `Only ${String(tile.stock.left)} left`, tone: "signal" as const }
  return null
}

export const badgeTone = { muted: "border-line-strong text-muted", ink: "border-ink text-ink", signal: "border-signal text-signal" }
