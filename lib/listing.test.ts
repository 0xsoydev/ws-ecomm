import { expect, test } from "vitest"
import { applyFilter, facetCounts, type Filterable, type ListingFilter } from "./listing"

const t = (name: string, over: Partial<Filterable> = {}): Filterable => ({
  code: null,
  name,
  priced: { retailPaise: null, wholesalePaise: 1000, moq: 1, minOrderQty: 1, orderStep: 1 },
  purchasable: false,
  image: null,
  stock: { kind: "untracked" },
  bodyStyle: null,
  vehicles: [],
  facets: [],
  ...over,
})

const items = [
  t("Mudguard DL", { bodyStyle: "dl_model", vehicles: [{ modelId: 1 }] }),
  t("Mudguard SL", { bodyStyle: "sl_model", stock: { kind: "out" } }),
  t("Lever", { vehicles: [{ modelId: 1 }, { modelId: 2 }], purchasable: true, priced: { retailPaise: null, wholesalePaise: 500, moq: 1, minOrderQty: 1, orderStep: 1 } }),
  t("Cell", { priced: { retailPaise: null, wholesalePaise: 90, moq: 100, minOrderQty: 100, orderStep: 100 } }),
]
const none: ListingFilter = { vehicle: null, body: null, stock: false, specs: [], sort: "recommended" }
const names = (f: ListingFilter) => applyFilter(items, f).map((i) => i.name)

test("recommended puts buyable first and out of stock last, otherwise keeps order", () => {
  expect(names(none)).toEqual(["Lever", "Mudguard DL", "Cell", "Mudguard SL"])
})

test("filters combine", () => {
  expect(names({ ...none, vehicle: 1 })).toEqual(["Lever", "Mudguard DL"])
  expect(names({ ...none, body: "sl_model", stock: true })).toEqual([])
})

test("price sorts by the headline price, so a 100-piece pack sorts by its pack total", () => {
  expect(names({ ...none, sort: "price-asc" })).toEqual(["Lever", "Mudguard DL", "Mudguard SL", "Cell"])
})

test("counts ignore their own facet", () => {
  const c = facetCounts(items, { ...none, vehicle: 2 })
  expect(c.vehicles.get(1)).toBe(2)
  expect(c.total).toBe(1)
  expect(c.inStock).toBe(1)
})

test("spec facets: OR within a key, AND across keys, counts ignore their own key", () => {
  const bms = [
    t("Daly 13S 40A", { facets: [["Maker", "Daly"], ["Series cells", "13S"]] }),
    t("JBD 13S 60A", { facets: [["Maker", "JBD"], ["Series cells", "13S"]] }),
    t("Daly 16S 40A", { facets: [["Maker", "Daly"], ["Series cells", "16S"]] }),
  ]
  const pick = (specs: string[]) => applyFilter(bms, { ...none, specs }).map((i) => i.name)
  expect(pick(["Maker=Daly"])).toEqual(["Daly 13S 40A", "Daly 16S 40A"])
  expect(pick(["Maker=Daly", "Maker=JBD"])).toHaveLength(3)
  expect(pick(["Maker=Daly", "Series cells=13S"])).toEqual(["Daly 13S 40A"])
  const counts = facetCounts(bms, { ...none, specs: ["Maker=Daly"] }).specs
  expect(counts.get("Maker")).toEqual(new Map([["Daly", 2], ["JBD", 1]]))
  expect(counts.get("Series cells")).toEqual(new Map([["13S", 1], ["16S", 1]]))
})
