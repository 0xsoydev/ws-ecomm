import { formatPaise } from "./format"
import type { StoreSettings } from "./schema"

export type ShiprocketMode = "off" | "manual" | "live"

export function deliveryScope(s: Pick<StoreSettings, "localDeliveryPincodes" | "courierAvailable">, interState: boolean, shiprocket: ShiprocketMode) {
  if (interState && shiprocket !== "off") return "Delivery across India"
  if (s.courierAvailable || shiprocket !== "off") return "Delivery within Maharashtra"
  if (s.localDeliveryPincodes.length > 0) return "Local delivery in Mumbai"
  return "Pick up in Malad West"
}

export function courierFee(s: Pick<StoreSettings, "shippingBands" | "freeShippingFromPaise">, itemsPaise: number) {
  if (s.freeShippingFromPaise !== null && itemsPaise >= s.freeShippingFromPaise) return 0
  const band = [...s.shippingBands].sort((a, b) => a.upToPaise - b.upToPaise).find((b) => itemsPaise <= b.upToPaise)
  return band ? band.feePaise : null
}

export function feeSummary(s: Pick<StoreSettings, "shippingBands" | "freeShippingFromPaise">) {
  const bands = [...s.shippingBands].sort((a, b) => a.upToPaise - b.upToPaise)
  const parts = bands.map((b) => `${formatPaise(b.feePaise)} up to ${formatPaise(b.upToPaise)}`)
  if (s.freeShippingFromPaise !== null) parts.push(`free from ${formatPaise(s.freeShippingFromPaise)}`)
  return parts.length ? parts.join(", ") : null
}
