import { expect, test } from "vitest"
import { deliveryScope } from "./delivery"

test("delivery scope widens with settings", () => {
  const base = { localDeliveryPincodes: [], courierAvailable: false }
  expect(deliveryScope(base, false, "off")).toBe("Pick up in Malad West")
  expect(deliveryScope({ ...base, localDeliveryPincodes: ["400064"] }, false, "off")).toBe("Local delivery in Mumbai")
  expect(deliveryScope({ ...base, courierAvailable: true }, false, "off")).toBe("Delivery within Maharashtra")
  expect(deliveryScope(base, false, "manual")).toBe("Delivery within Maharashtra")
  expect(deliveryScope(base, true, "off")).toBe("Pick up in Malad West")
  expect(deliveryScope(base, true, "live")).toBe("Delivery across India")
})
