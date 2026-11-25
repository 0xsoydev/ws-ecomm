import { expect, test, type Page } from "@playwright/test"

const phoneFor = (project: string, n: number) => `98${project === "phone" ? "1" : "2"}${String(n).padStart(7, "0")}`

async function placeOrder(page: Page) {
  await page.getByRole("button", { name: /^Place order/ }).click()
}

test("policy pages exist for every footer link", async ({ page }) => {
  for (const slug of ["shipping", "returns", "warranty", "terms", "privacy"]) {
    const res = await page.goto(`/pages/${slug}`)
    expect(res?.status()).toBe(200)
  }
})

test("search suggests parts while typing and finds by code", async ({ page }) => {
  await page.goto("/")
  const search = page.getByRole("combobox", { name: /search parts/i }).filter({ visible: true }).first()
  await search.fill("13s")
  await expect(page.getByRole("option", { name: /Daly BMS 13S 40A/ })).toBeVisible()
  await search.press("Enter")
  await expect(page).toHaveURL(/\/search\?q=13s/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for 13s")
  await expect(page.getByRole("link", { name: "Cell holder 18650 (8x15)" })).toHaveCount(0)
})

test("buying a part at the wholesale break, then checking out by courier with the delivery charge", async ({ page }, info) => {
  await page.goto("/p/disc-pad-dp13-ola-rear")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Disc pad DP13 Ola rear")
  await expect(page.getByText("Add 1 more for ₹120 / set").filter({ visible: true })).toBeVisible()
  await page.getByRole("radio", { name: /2 or more/ }).click()
  await expect(page.getByText("Wholesale price applied").filter({ visible: true })).toBeVisible()
  await page.locator("#buy-main").getByRole("button", { name: "Add to cart" }).click()

  await page.goto("/c/batteries-bms")
  await page.getByRole("button", { name: "Add Daly BMS 13S 40A, 48V to cart" }).first().click()
  await expect(page.getByRole("button", { name: "One more Daly BMS 13S 40A, 48V" }).first()).toBeVisible()

  await page.goto("/cart")
  await expect(page.getByRole("link", { name: "Disc pad DP13 Ola rear" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Daly BMS 13S 40A, 48V" })).toBeVisible()
  await page.getByRole("link", { name: "Proceed to checkout" }).filter({ visible: true }).first().click()

  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText("₹80 delivery. Pay by UPI once we confirm.").filter({ visible: true })).toBeVisible()
  await page.getByText("₹80 delivery. Pay by UPI once we confirm.").click()
  await placeOrder(page)
  await expect(page.getByText("Enter a 10-digit mobile number").filter({ visible: true })).toBeVisible()
  await expect(page.locator("#co-phone")).toBeFocused()

  await page.locator("#co-phone").fill(phoneFor(info.project.name, 1))
  await page.locator("#co-name").fill("Ravi Patil")
  await page.locator("#co-line1").fill("B-12, Shanti Niwas")
  await page.locator("#co-line2").fill("Marve Road")
  await page.locator("#co-city").fill("Mumbai")
  await page.locator("#co-pincode").fill("560001")
  await placeOrder(page)
  await expect(page.getByText(/We deliver within Maharashtra only/).filter({ visible: true })).toBeVisible()
  await page.locator("#co-pincode").fill("400064")
  await placeOrder(page)

  await expect(page).toHaveURL(/\/order\/WS\d+/)
  await expect(page.getByRole("link", { name: "Send on WhatsApp" })).toHaveAttribute("href", /wa\.me\/919821784847\?text=Order%20WS\d+/)
  await expect(page.getByText("₹80", { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText("₹1,420", { exact: true }).filter({ visible: true })).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/\/checkout/)
})

test("search keeps the query, understands misspellings and offers vehicle pages", async ({ page }) => {
  await page.goto("/search?q=dp13")
  await expect(page.getByRole("combobox", { name: /search parts/i }).filter({ visible: true }).first()).toHaveValue("dp13")
  await page.goto("/search?q=break%20pad")
  await expect(page.getByRole("link", { name: "Disc pad DP13 Ola rear" }).first()).toBeVisible()
  await page.goto("/search?q=ola")
  await page.getByRole("link", { name: /Parts for Ola S1/ }).click()
  await expect(page).toHaveURL(/\/v\/ola\/s1/)
  await page.getByRole("link", { name: "Ola", exact: true }).first().click()
  await expect(page).toHaveURL(/\/v\/ola$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ola parts")
})

test("out of stock parts cannot be added and say so", async ({ page }) => {
  await page.goto("/p/jbd-bms-16s-40a")
  await expect(page.getByText("This part is out of stock.").filter({ visible: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0)
})

test("an order page does not open in another browser", async ({ browser, page }, info) => {
  await page.goto("/p/lever-ola-drum")
  await page.locator("#buy-main").getByRole("button", { name: "Add to cart" }).click()
  await page.goto("/checkout")
  await page.locator("#co-phone").fill(phoneFor(info.project.name, 2))
  await page.locator("#co-name").fill("Asha Shaikh")
  await page.getByText("Pick up at the shop", { exact: true }).click()
  await expect(page.getByRole("radio", { name: /Pay at the shop/ })).toBeChecked()
  await placeOrder(page)
  await expect(page).toHaveURL(/\/order\/WS\d+/)
  await expect(page.getByText("Pay at the shop, cash or UPI").filter({ visible: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Continue shopping" })).toBeVisible()
  await expect(page).toHaveURL(/\/order\/WS\d+/)
  const other = await browser.newPage()
  await other.goto(page.url())
  await expect(other.getByText(/order details open only in the browser the order was placed from/).filter({ visible: true })).toBeVisible()
  await other.close()
})

test("a popular-parts tile opens its section filtered to those categories", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("navigation", { name: "Popular parts" }).getByRole("link", { name: /^BMS/ }).click()
  await expect(page).toHaveURL(/\/c\/batteries-bms\?show=bms-48v(,|%2C)bms-60v/)
  await expect(page.getByRole("button", { name: "Remove filter 48V BMS" })).toBeVisible()
  await expect(page.getByRole("heading", { name: /Cells/ })).toHaveCount(0)
  await page.getByRole("button", { name: "Remove filter 48V BMS" }).click()
  await expect(page.getByRole("heading", { name: /Cells/ })).toBeVisible()
})
