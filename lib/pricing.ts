import type { priceTier } from "./schema"

type Tier = (typeof priceTier.enumValues)[number]
export type Priced = { retailPaise: number | null; wholesalePaise: number; moq: number; minOrderQty: number; orderStep: number }

export class BelowMinimum extends Error {}
export class OverMaximum extends Error {}
export class OffStep extends Error {}

export const MAX_LINE_QTY = 10000

export function minQty(p: Priced) {
  return p.retailPaise === null ? p.moq : p.minOrderQty
}

export function unitPrice(p: Priced, qty: number): { paise: number; tier: Tier } {
  if (!Number.isInteger(qty) || qty < minQty(p)) throw new BelowMinimum()
  if (qty % p.orderStep !== 0) throw new OffStep()
  if (qty > MAX_LINE_QTY) throw new OverMaximum()
  return qty >= p.moq || p.retailPaise === null ? { paise: p.wholesalePaise, tier: "wholesale" } : { paise: p.retailPaise, tier: "retail" }
}

export function nextBreak(p: Priced, qty: number) {
  return p.retailPaise !== null && qty < p.moq ? { addQty: p.moq - qty, paise: p.wholesalePaise } : null
}

export function listingPrice(p: Priced) {
  const qty = minQty(p)
  return { paise: unitPrice(p, qty).paise * qty, qty }
}

export function hasRetailTier(p: Pick<Priced, "moq" | "minOrderQty">) {
  return p.moq > 1 && p.minOrderQty < p.moq
}

export function proposeRetailPaise(wholesalePaise: number) {
  const raw = (wholesalePaise * 125) / 100
  const step = raw < 10000 ? 100 : 500
  return Math.ceil(raw / step) * step
}
