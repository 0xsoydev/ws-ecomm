import { expect, test } from "vitest"
import { normalise, searchProducts, searchTerms } from "./search"

const item = (code: string | null, name: string, context: string[] = [], purchasable = false) => ({
  code,
  name,
  terms: searchTerms([code, name]),
  context: searchTerms(context),
  image: null,
  purchasable,
  stock: { kind: "untracked" },
})

const items = [
  item("13S 40A", "Daly BMS 13S 40A, 48V", ["48V BMS", "Batteries & BMS"]),
  item("6203 2RS", "Ball bearing 6203 2RS", ["Bearings & ball racers"]),
  item(null, "SB50 power connector", ["Connectors"]),
  item(null, "Throttle with reverse switch", ["Throttles"]),
  item(null, "Brake lever, Ola S1", ["Brake parts"]),
  item(null, "Cell holder 18650", ["Cells & holders", "Batteries & BMS"]),
  item("LB2 OVAL", "LED bulb LB2 oval", ["Bulbs & holders"]),
  item(null, "Battery box lock", ["Battery accessories"]),
]

const names = (q: string) => searchProducts(items, q).map((i) => i.name)

test("normalise strips separators", () => {
  expect(normalise(" SB-50 (Red)/x ")).toBe("sb50redx")
})

test("codes win, in any spacing", () => {
  expect(names("13s")[0]).toBe("Daly BMS 13S 40A, 48V")
  expect(names("6203")[0]).toBe("Ball bearing 6203 2RS")
  expect(names("sb 50")[0]).toBe("SB50 power connector")
  expect(names("lb2oval")[0]).toBe("LED bulb LB2 oval")
})

test("typos and shop words still find the part", () => {
  expect(names("throtle")).toContain("Throttle with reverse switch")
  expect(names("accelerator")).toContain("Throttle with reverse switch")
  expect(names("बैटरी")).toContain("Battery box lock")
  expect(names("ola lever")).toEqual(["Brake lever, Ola S1"])
})

test("too short or empty returns nothing", () => {
  expect(names("")).toEqual([])
  expect(names("a")).toEqual([])
  expect(names("zzzz")).toEqual([])
})

test("purchasable ranks above display-only at equal score", () => {
  const both = [item(null, "Mirror left", [], false), item(null, "Mirror right", [], true)]
  expect(searchProducts(both, "mirror").map((i) => i.name)).toEqual(["Mirror right", "Mirror left"])
})

test("a category word alone does not drag in the whole category when names match", () => {
  expect(names("bms")).toEqual(["Daly BMS 13S 40A, 48V"])
  expect(names("holders")).toContain("Cell holder 18650")
})
