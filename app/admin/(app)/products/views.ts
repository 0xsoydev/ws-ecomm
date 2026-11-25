import type { ProductRow } from "./load"

export const VIEWS = {
  all: { label: "All", test: () => true },
  fix: { label: "Not buyable", test: (r: ProductRow) => r.status === "active" && r.issues.length > 0 },
  prices: { label: "Prices", test: (r: ProductRow) => r.status === "active" && !r.priceApproved },
  photos: { label: "Photos to sort", test: (r: ProductRow) => r.unsortedPhotos > 0 },
  vehicles: { label: "Vehicles to check", test: (r: ProductRow) => r.uncheckedFits > 0 },
  out: { label: "Out of stock", test: (r: ProductRow) => r.stock === 0 },
  draft: { label: "Draft or archived", test: (r: ProductRow) => r.status !== "active" },
} as const

export type View = keyof typeof VIEWS

export function isView(v: string | null): v is View {
  return v !== null && v in VIEWS
}

export function todo(r: ProductRow) {
  return r.status === "active" && (r.issues.length > 0 || !r.priceApproved || r.unsortedPhotos > 0 || r.uncheckedFits > 0)
}

export function todoText(r: ProductRow) {
  const parts: string[] = []
  if (r.status === "active" && !r.priceApproved) parts.push("price to approve")
  if (r.unsortedPhotos) parts.push(`${String(r.unsortedPhotos)} ${r.unsortedPhotos === 1 ? "photo" : "photos"} to sort`)
  if (r.uncheckedFits) parts.push(`${String(r.uncheckedFits)} ${r.uncheckedFits === 1 ? "vehicle" : "vehicles"} to check`)
  const other = r.issues.filter((i) => i !== "price").length
  if (r.status === "active" && other) parts.push(`${String(other)} more to fix`)
  return parts.join(", ")
}
