import { describe, expect, test } from "vitest"
import { BelowMinimum, listingPrice, minQty, nextBreak, OffStep, OverMaximum, priceCopy, proposeRetailPaise, unitPrice, type Priced } from "./pricing"

const bulb: Priced = { retailPaise: 18000, wholesalePaise: 16000, moq: 3, minOrderQty: 1, orderStep: 1 }
const singlePrice: Priced = { retailPaise: null, wholesalePaise: 420000, moq: 1, minOrderQty: 1, orderStep: 1 }
const cellPack: Priced = { retailPaise: null, wholesalePaise: 9000, moq: 100, minOrderQty: 100, orderStep: 100 }
const unapprovedRetail: Priced = { retailPaise: null, wholesalePaise: 2600, moq: 10, minOrderQty: 1, orderStep: 1 }

describe("unitPrice", () => {
  test("retail below the break, wholesale from it", () => {
    expect(unitPrice(bulb, 2)).toEqual({ paise: 18000, tier: "retail" })
    expect(unitPrice(bulb, 3)).toEqual({ paise: 16000, tier: "wholesale" })
  })

  test("without a retail price the break is the minimum", () => {
    expect(minQty(unapprovedRetail)).toBe(10)
    expect(() => unitPrice(unapprovedRetail, 1)).toThrow(BelowMinimum)
    expect(unitPrice(unapprovedRetail, 10).tier).toBe("wholesale")
  })

  test("pack items step in pack sizes", () => {
    expect(() => unitPrice(cellPack, 150)).toThrow(OffStep)
    expect(unitPrice(cellPack, 200).paise).toBe(9000)
  })

  test("rejects fractions, zero and absurd quantities", () => {
    expect(() => unitPrice(bulb, 1.5)).toThrow(BelowMinimum)
    expect(() => unitPrice(bulb, 0)).toThrow(BelowMinimum)
    expect(() => unitPrice(bulb, 10001)).toThrow(OverMaximum)
  })
})

describe("listingPrice and nextBreak", () => {
  test("headline price is the price of the minimum purchase", () => {
    expect(listingPrice(bulb)).toEqual({ paise: 18000, qty: 1 })
    expect(listingPrice(singlePrice)).toEqual({ paise: 420000, qty: 1 })
    expect(listingPrice(cellPack)).toEqual({ paise: 900000, qty: 100 })
  })

  test("nudges only while below the break", () => {
    expect(nextBreak(bulb, 1)).toEqual({ addQty: 2, paise: 16000 })
    expect(nextBreak(bulb, 3)).toBeNull()
    expect(nextBreak(singlePrice, 1)).toBeNull()
  })
})

describe("proposeRetailPaise", () => {
  test("wholesale × 1.25, up to ₹1 below ₹100 and to ₹5 from ₹100", () => {
    expect(proposeRetailPaise(1500)).toBe(1900)
    expect(proposeRetailPaise(2600)).toBe(3300)
    expect(proposeRetailPaise(450)).toBe(600)
    expect(proposeRetailPaise(16000)).toBe(20000)
    expect(proposeRetailPaise(10500)).toBe(13500)
    expect(proposeRetailPaise(105000)).toBe(131500)
  })
})

describe("priceCopy", () => {
  test("retail with a wholesale break", () => {
    expect(priceCopy(bulb, "pcs")).toEqual({ main: "₹180 / pc", sub: "₹160 / pc from 3" })
  })

  test("pack-only items state the minimum", () => {
    expect(priceCopy(cellPack, "pcs")).toEqual({ main: "₹90 / pc", sub: "Minimum 100 pcs" })
  })

  test("unapproved retail sells at the old price from the break and never invents a retail price", () => {
    expect(priceCopy(unapprovedRetail, "pcs")).toEqual({ main: "₹26 / pc", sub: "Minimum 10 pcs" })
  })

  test("single price uses the unit", () => {
    expect(priceCopy(singlePrice, "set")).toEqual({ main: "₹4,200 / set", sub: null })
  })

  test("paise survive", () => {
    expect(priceCopy({ ...singlePrice, wholesalePaise: 150 }, "pcs").main).toBe("₹1.50 / pc")
  })
})
