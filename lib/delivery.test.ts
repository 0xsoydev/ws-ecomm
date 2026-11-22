import { expect, test } from "vitest"
import { courierFee, deliveryScope } from "./delivery"

test("delivery scope widens with settings", () => {
  const base = { localDeliveryPincodes: [], courierAvailable: false }
  expect(deliveryScope(base, false, "off")).toBe("Pick up in Malad West")
  expect(deliveryScope({ ...base, localDeliveryPincodes: ["400064"] }, false, "off")).toBe("Local delivery in Mumbai")
  expect(deliveryScope({ ...base, courierAvailable: true }, false, "off")).toBe("Delivery within Maharashtra")
  expect(deliveryScope(base, false, "manual")).toBe("Delivery within Maharashtra")
  expect(deliveryScope(base, true, "off")).toBe("Pick up in Malad West")
  expect(deliveryScope(base, true, "live")).toBe("Delivery across India")
})

test("courier fee comes from the first band that covers the order, or null for a quote", () => {
  const s = { shippingBands: [{ upToPaise: 300000, feePaise: 15000 }, { upToPaise: 100000, feePaise: 8000 }], freeShippingFromPaise: 500000 }
  expect(courierFee(s, 50000)).toBe(8000)
  expect(courierFee(s, 100000)).toBe(8000)
  expect(courierFee(s, 250000)).toBe(15000)
  expect(courierFee(s, 400000)).toBeNull()
  expect(courierFee(s, 500000)).toBe(0)
  expect(courierFee({ shippingBands: [], freeShippingFromPaise: null }, 50000)).toBeNull()
})
