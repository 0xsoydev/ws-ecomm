import type { StoreSettings } from "./schema"

export type ShiprocketMode = "off" | "manual" | "live"

export function deliveryScope(s: Pick<StoreSettings, "localDeliveryPincodes" | "courierAvailable">, interState: boolean, shiprocket: ShiprocketMode) {
  if (interState && shiprocket !== "off") return "Delivery across India"
  if (s.courierAvailable || shiprocket !== "off") return "Delivery within Maharashtra"
  if (s.localDeliveryPincodes.length > 0) return "Local delivery in Mumbai"
  return "Pick up in Malad West"
}
