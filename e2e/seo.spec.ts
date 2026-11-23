import { expect, test } from "@playwright/test"

test.describe.configure({ mode: "parallel" })

for (const path of ["/p/does-not-exist", "/c/nope", "/c/batteries-bms/nope", "/v/ola/zzz", "/v/nope", "/pages/nope", "/nope"]) {
  test(`${path} answers 404 with the shop around it`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(404)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn’t find that page.")
    await expect(page.getByRole("link", { name: "Go to the home page" })).toBeVisible()
    await expect(page).toHaveTitle("Page not found | WS Green")
  })
}

test("every page type has one clean title and a canonical", async ({ page }) => {
  const titles = new Set<string>()
  for (const path of ["/", "/c/batteries-bms", "/c/batteries-bms/bms-48v", "/p/disc-pad-dp13-ola-rear", "/v/ola/s1", "/v/ola", "/pages/returns", "/wholesale", "/prices"]) {
    await page.goto(path)
    const title = await page.title()
    expect(title, path).not.toMatch(/WS Green.*WS Green/)
    expect(title, path).not.toContain("DP13 OLA REAR")
    titles.add(title)
    await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute("href", new RegExp(`${path === "/" ? "" : path === "/v/ola" ? "/v/ola/s1" : path}$`))
    await expect(page.locator('meta[name="description"]'), path).toHaveAttribute("content", /.{40,}/)
  }
  expect(titles.size).toBe(9)
})

async function product(page: import("@playwright/test").Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  return blocks.flatMap((b) => [JSON.parse(b) as unknown].flat()).find((n): n is { offers: { price: string; eligibleQuantity?: { minValue: number } }; mpn?: string; sku: string } => typeof n === "object" && n !== null && "@type" in n && n["@type"] === "Product")
}

test("Product structured data shows the same per-piece price as the page", async ({ page }) => {
  await page.goto("/p/disc-pad-dp13-ola-rear")
  const pad = await product(page)
  expect(pad?.offers.price).toBe("150.00")
  expect(pad?.offers.eligibleQuantity).toBeUndefined()
  expect(pad?.mpn).toBe("DP13 OLA REAR")
  expect(pad?.sku).toMatch(/^WSG-/)
  await expect(page.getByText("₹150 / set").filter({ visible: true }).first()).toBeVisible()

  await page.goto("/p/cell-holder-18650")
  const holder = await product(page)
  expect(holder?.offers.price).toBe("65.00")
  expect(holder?.offers.eligibleQuantity?.minValue).toBe(10)
  await expect(page.getByText("₹65 / pc").filter({ visible: true }).first()).toBeVisible()
})
