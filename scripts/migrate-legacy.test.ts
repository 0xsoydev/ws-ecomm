import { describe, expect, test } from "vitest"
import { bodyStyleFor, categoryFor, cleanName, cleanSpecs, descriptionFor, partCodeFor, plan, publicIdFor, qualityFor, slugify, vehiclesFor, type LegacyRow } from "./migrate-legacy"

describe("cleanName", () => {
  test.each([
    ["NMC 13S 100A SAME PORT W/P DALY BMS", "NMC 13S 100A same port waterproof Daly BMS"],
    ["BULB [LED LB2 OVAL]", "Bulb LED LB2 oval"],
    ["BULB LED 6 LIGHTS (OUT OF STOCK)", "Bulb LED 6 lights"],
    ["IG HD17-HD27 Small (HEAVY OEM)", "IG HD17-HD27 small"],
    ["IG [L3 OPTMA+2D] (BLK) (HERO LOCK)", "IG L3 Optima+2D (black) (Hero lock)"],
    ["SIDE FOOTREST TSV ICUB ", "Side footrest TVS iQube"],
    ["NOZZLE L-TYPE", "Nozzle L-type"],
    ["BEARING [HC 6203 HD] ORIGINAL", "Bearing HC 6203 HD"],
    ["QY SB 50+3 PIN CHARGING SOCKET", "QY SB 50+3 pin charging socket"],
  ])("%s", (legacy, clean) => {
    expect(cleanName(legacy)).toBe(clean)
  })
})

describe("codes, makers, quality, vehicles", () => {
  test("part codes", () => {
    expect(partCodeFor("NMC 13S 100A SAME PORT W/P DALY BMS")).toBe("13S 100A")
    expect(partCodeFor("BULB [LED LB2 OVAL]")).toBe("LED LB2 OVAL")
    expect(partCodeFor("SB50 CONNECTOR SET")).toBe("SB50")
    expect(partCodeFor("MIRROR CHROME ROUND")).toBeNull()
  })

  test("quality words become a hidden tier, not part of the name", () => {
    expect(qualityFor("IG P17-P27 Small (LOW QUALITY)")).toBe("economy")
    expect(qualityFor("IG HD17-HD27 Small (HEAVY OEM)")).toBe("oem")
    expect(qualityFor("BEARING [HC 6200 HD] ORIGINAL")).toBe("original")
    expect(qualityFor("SWITCH [DIM-NEW]")).toBeNull()
  })

  test("vehicle links come only from explicit names", () => {
    expect(vehiclesFor("DISC PAD AETHER [DP10 ATH FRONT]")).toEqual(["ather/450"])
    expect(vehiclesFor("GLASS COVER OKINAWA 10C BLACK")).toEqual(["okinawa/praise", "okinawa/ridge"])
    expect(vehiclesFor("SIDE FOOTREST TSV ICUB ")).toEqual(["tvs/iqube"])
    expect(vehiclesFor("MIRROR HEXA")).toEqual([])
  })
})

describe("taxonomy", () => {
  test("legacy categories that split", () => {
    expect(categoryFor({ category: "SPEEDOMETER & GLASS COVER", name: "GLASS COVER MAGNUS BLACK" })).toBe("meter-glass-covers")
    expect(categoryFor({ category: "SPEEDOMETER & GLASS COVER", name: "SPEEDOMETER [LED OKINAWA]" })).toBe("speedometers")
    expect(categoryFor({ category: "OLA / AETHER ETC. PARTS", name: "OLA SIDE FOOTREST LEFT+RIGHT BLK" })).toBe("footrests-backrests")
    expect(categoryFor({ category: "OLA / AETHER ETC. PARTS", name: "LEVER AETHER" })).toBe("brake-parts")
    expect(categoryFor({ category: "HEADLIGHT", name: "LOADER METER" })).toBe("speedometers")
    expect(categoryFor({ category: "BULBS & LIGHTS", name: "HEADLIGHT LCD BOW" })).toBe("headlights")
    expect(() => categoryFor({ category: "NEW THING", name: "X" })).toThrow()
  })

  test("body styles", () => {
    expect(bodyStyleFor({ category: "BODY PARTS", name: "METER COVER D/L MODEL" })).toBe("dl_model")
    expect(bodyStyleFor({ category: "SL MODEL BODY PARTS", name: "VISOR SL MODEL" })).toBe("sl_model")
    expect(bodyStyleFor({ category: "FRONT SHOCKER & HANDLE TEE", name: "3 WHEELER SHOCKER" })).toBe("three_wheeler")
    expect(bodyStyleFor({ category: "MUDGUARD", name: "LOADER MUDGUARD" })).toBe("loader")
  })
})

describe("specs, copy, slugs, images", () => {
  test("specs fix keys and values and drop empties and Universal", () => {
    const { specs } = cleanSpecs(JSON.stringify({ Voltag: "48V", Colo: "Black", Compatibility: "Universal", Material: " ", Function: "Igniton Swtich" }))
    expect(specs).toEqual({ Voltage: "48V", Colour: "Black", Function: "Ignition Switch" })
    expect(cleanSpecs("{not json").flags).toHaveLength(1)
  })

  test("known mismatched descriptions are cleared", () => {
    expect(descriptionFor({ name: "HOLDER [BACKLIGHT]", description: "H_OUT holder" })).toEqual({ description: "", cleared: true })
    expect(descriptionFor({ name: "MIRROR HEXA", description: "A mirror.\r\n" })).toEqual({ description: "A mirror.", cleared: false })
  })

  test("slugs and Cloudinary ids", () => {
    expect(slugify("Cell holder 18650(8X15)")).toBe("cell-holder-18650-8x15")
    expect(slugify("IG L3 Optima+2D (black)")).toBe("ig-l3-optima-plus-2d-black")
    expect(publicIdFor("https://res.cloudinary.com/dbmblxf0a/image/upload/v1766318953/catalogue-app/rlo.jpg")).toBe("catalogue-app/rlo")
    expect(publicIdFor("https://evil.example/image.jpg")).toBeNull()
  })
})

describe("plan", () => {
  const row = (over: Partial<LegacyRow>): LegacyRow => ({
    id: Math.random().toString(36).slice(2),
    name: "BULB [TAIL LIGHT]",
    description: "",
    price: 15,
    category: "BULBS & LIGHTS",
    imageUrl: "https://res.cloudinary.com/dbmblxf0a/image/upload/v1/catalogue-app/a.jpg",
    images: [],
    specs: "{}",
    minimumQuantity: 3,
    quantityType: "PCS",
    updatedAt: new Date("2026-01-01"),
    ...over,
  })

  test("identical duplicates merge, every row is accounted for, images are unioned", () => {
    const rows = [row({}), row({ imageUrl: "https://res.cloudinary.com/dbmblxf0a/image/upload/v1/catalogue-app/b.jpg" }), row({ name: "MIRROR HEXA", price: 200, minimumQuantity: 2 })]
    const result = plan(rows)
    expect(result.products).toHaveLength(2)
    expect(result.accounted).toBe(3)
    const bulb = result.products.find((p) => p.name === "Bulb tail light")
    expect(bulb?.images.sort()).toEqual(["catalogue-app/a", "catalogue-app/b"])
    expect(bulb?.proposedRetailPaise).toBe(1900)
  })

  test("same name with different terms stays as two drafts", () => {
    const result = plan([row({}), row({ price: 20 })])
    expect(result.products.map((p) => p.status)).toEqual(["draft", "draft"])
    expect(new Set(result.products.map((p) => p.slug)).size).toBe(2)
  })

  test("the cell pack is pack-only, pickup or freight, with no retail tier", () => {
    const [cell] = plan([row({ name: "LITHUM-ION CELL 2600MAH (DMEGC) (PACK OF 200)", category: "EV CELL & HOLDER", price: 90, minimumQuantity: 100 })]).products
    expect(cell).toMatchObject({ moq: 100, minOrderQty: 100, orderStep: 100, proposedRetailPaise: null, fulfilment: "pickup_or_freight", batteryKind: "cell", maker: "DMEGC" })
  })
})
