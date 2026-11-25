import { describe, expect, test } from "vitest"
import { isPurchasable, purchasableIssues } from "./catalog"

const ctx = { collectsTax: false, eprRegistration: null, packStandard: null }
const ready = {
  status: "active" as const,
  maker: "Sai Traders",
  makerAddress: "Lamington Road, Mumbai 400007",
  prePackaged: false,
  netQuantity: null,
  mrpPaise: null,
  batteryKind: "none" as const,
  bisRegistration: null,
  bisVerifiedAt: null,
  priceApproved: true,
  hsn: null,
}

describe("purchasableIssues", () => {
  test("a loose part with an approved price is buyable", () => {
    expect(purchasableIssues(ready, ctx)).toEqual([])
  })

  test("pre-packaged undecided means not buyable", () => {
    expect(purchasableIssues({ ...ready, prePackaged: null }, ctx)).toEqual(["prePackaged"])
  })

  test("country of origin and importer are not asked for; a maker is needed only when pre-packaged", () => {
    expect(purchasableIssues({ ...ready, maker: null, makerAddress: null }, ctx)).toEqual([])
    expect(purchasableIssues({ ...ready, maker: null, prePackaged: true }, ctx)).toEqual(["netQuantity", "mrp", "maker"])
  })

  test("cells need a verified BIS number, packs need EPR, HSN only when tax is collected", () => {
    expect(purchasableIssues({ ...ready, batteryKind: "cell", bisRegistration: "R-41000000" }, ctx)).toEqual(["bis"])
    expect(purchasableIssues({ ...ready, batteryKind: "pack" }, ctx)).toEqual(["epr"])
    expect(purchasableIssues(ready, { ...ctx, collectsTax: true })).toEqual(["hsn"])
    expect(isPurchasable({ ...ready, status: "draft", priceApproved: false }, ctx)).toBe(false)
  })
})
