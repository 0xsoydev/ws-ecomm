import { expect, test } from "vitest"
import { codeMissing, EXACT, matchesName, searchScored, normalise, searchProducts, searchTerms } from "./search"

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
  item(null, "Smart controller 48/60/72V 30A Calc", ["Controllers", "Controllers & electricals"]),
  item(null, "Sinewave controller 48-72V 35A, black", ["Controllers", "Controllers & electricals"]),
  item(null, "DC-DC converter 10A, one wire (transverter)", ["Converters", "Controllers & electricals"]),
  item(null, "SB50 connector set, grey", ["Connectors", "Connectors & charging"]),
  item(null, "Speedometer SM51 meter display, black", ["Speedometers", "Dashboard"]),
  item(null, "Battery box lock", ["Battery accessories"]),
]

const names = (q: string) => searchProducts(items, q).map((i) => i.name)

test("normalise strips separators", () => {
  expect(normalise(" SB-50 (Red)/x ")).toBe("sb50redx")
})

test("codes win, in any spacing", () => {
  expect(names("13s")[0]).toBe("Daly BMS 13S 40A, 48V")
  expect(names("6203")[0]).toBe("Ball bearing 6203 2RS")
  expect(names("sb 50")[0]).toMatch(/^SB50 /)
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

test("name matches rank above parts that only share the category", () => {
  const found = names("bms")
  expect(found[0]).toBe("Daly BMS 13S 40A, 48V")
  expect(found.slice(1)).toEqual(expect.arrayContaining(["Cell holder 18650"]))
})

test("misspellings and synonyms find the part", () => {
  expect(names("break lever")).toContain("Brake lever, Ola S1")
  expect(names("throtle")).toContain("Throttle with reverse switch")
  expect(names("accelator")).toContain("Throttle with reverse switch")
  expect(names("tyre")).toEqual([])
})

test("names match by stem and transposition", () => {
  expect(matchesName("Batteries & BMS", "battery")).toBe(true)
  expect(matchesName("Batteries & BMS", "बैटरी")).toBe(true)
  expect(matchesName("Brake parts", "barke")).toBe(true)
  expect(matchesName("Ola S1", "ola")).toBe(true)
  expect(matchesName("Lighting", "ola")).toBe(false)
})

test("a code is added to a name only when the name lacks its words", () => {
  expect(codeMissing("Rear disc brake pads DP13 for Ola S1", "DP13 OLA REAR")).toBe(false)
  expect(codeMissing("Daly BMS 13S 40A, 48V", "13S 40A")).toBe(false)
  expect(codeMissing("Dipper switch", "SW-DIM")).toBe(true)
  expect(codeMissing("Dipper switch", null)).toBe(false)
})

test("plural, Hinglish and Hindi words reach the right parts", () => {
  expect(names("breaks")).toContain("Brake lever, Ola S1")
  expect(names("brek")).toContain("Brake lever, Ola S1")
  expect(names("battery")).toEqual(expect.arrayContaining(["Daly BMS 13S 40A, 48V", "Battery box lock"]))
  expect(names("बैटरी")).toContain("Daly BMS 13S 40A, 48V")
})

test("voltage lists and ranges match a single voltage", () => {
  expect(names("48v 30a")).toEqual(["Smart controller 48/60/72V 30A Calc"])
  expect(names("60v controller")).toEqual(expect.arrayContaining(["Smart controller 48/60/72V 30A Calc", "Sinewave controller 48-72V 35A, black"]))
})

test("misspelt converter finds converters, not connectors", () => {
  expect(names("convertor")).toEqual(["DC-DC converter 10A, one wire (transverter)"])
})

test("no full match falls back to parts matching most words", () => {
  expect(names("speedometer ola")).toEqual(expect.arrayContaining(["Speedometer SM51 meter display, black"]))
})

test("an exact code ranks first and is marked exact", () => {
  const top = searchScored(items, "13S 40A")[0]
  expect(top?.item.name).toBe("Daly BMS 13S 40A, 48V")
  expect(top?.s).toBeGreaterThanOrEqual(EXACT)
})
