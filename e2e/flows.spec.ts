import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { OWNER } from "./constants"

test("Add to cart on a product page keeps keyboard focus on the next step", async ({ page }) => {
  await page.goto("/p/lever-ola-drum")
  await page.waitForLoadState("networkidle")
  const add = page.locator("#buy-main").getByRole("button", { name: "Add to cart" })
  await add.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator("#buy-main").getByRole("link", { name: "View cart" })).toBeFocused()
})

test("the filter sheet keeps Tab inside it", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the sheet is the phone filter")
  await page.goto("/c/batteries-bms")
  await page.getByRole("button", { name: /Filter and sort/ }).click()
  const dialog = page.getByRole("dialog", { name: "Filter and sort" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute("aria-modal", "true")
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab")
    const escaped = await page.evaluate(() => {
      const a = document.activeElement
      return a !== null && a !== document.body && !a.hasAttribute("data-base-ui-focus-guard") && a.closest("[role=dialog]") === null ? a.outerHTML.slice(0, 80) : null
    })
    expect(escaped).toBeNull()
  }
})

test("spec filters narrow a listing", async ({ page }, info) => {
  await page.goto("/c/batteries-bms/bms-48v")
  const phone = info.project.name === "phone"
  if (phone) await page.getByRole("button", { name: /Filter and sort/ }).click()
  await (phone ? page.getByRole("dialog") : page.getByRole("complementary", { name: "Filters" })).getByRole("button", { name: /^Daly/ }).click()
  if (phone) await page.getByRole("button", { name: /^Show / }).click()
  await expect(page).toHaveURL(/spec=Maker(%3D|=)Daly/)
  await expect(page.getByRole("link", { name: "Daly BMS 13S 40A, 48V" }).filter({ visible: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "JBD BMS 13S 60A, 48V" }).filter({ visible: true })).toHaveCount(0)
})

test("an order under the minimum is explained before and at checkout", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the admin settings test changes the minimum later in the desktop run")
  await page.goto("/p/disc-pad-dp13-ola-rear")
  await expect(page.getByText("Orders start at ₹200").filter({ visible: true })).toBeVisible()
  await expect(page.locator("#buy-main").getByRole("button", { name: "Buy now" })).toHaveCount(0)
  await page.locator("#buy-main").getByRole("button", { name: "Add to cart" }).click()
  await page.goto("/checkout")
  await page.locator("#co-phone").fill("9840000001")
  await page.locator("#co-name").fill("Small Order")
  await page.getByRole("button", { name: "Add ₹50 more to order" }).click()
  await expect(page.locator("#co-min")).toBeFocused()
  await expect(page.locator("#co-min")).toContainText("The minimum order is ₹200. Add ₹50 more.")
  await expect(page).toHaveURL(/\/checkout/)
})

test("JavaScript sent to a phone stays within budget", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "one budget run")
  for (const path of ["/", "/c/batteries-bms", "/p/disc-pad-dp13-ola-rear"]) {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    const bytes = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.name.endsWith(".js") || (r as PerformanceResourceTiming).initiatorType === "script").reduce((s, r) => s + (r as PerformanceResourceTiming).encodedBodySize, 0))
    expect(bytes, path).toBeLessThan(240 * 1024)
  }
})

test("admin screens have no accessibility problems", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one admin run")
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(OWNER.email)
  await page.getByLabel("Password").fill(OWNER.password)
  await page.getByRole("button", { name: "Sign in with password" }).click()
  await expect(page).toHaveURL(/\/admin$/)
  for (const path of ["/admin", "/admin/orders", "/admin/settings"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${path} ${v.id}`)).toEqual([])
  }
})

test("after ordering, Back to the cart offers no Undo that would re-add the ordered part", async ({ page }, info) => {
  await page.goto("/p/lever-ola-drum")
  await page.locator("#buy-main").getByRole("button", { name: "Add to cart" }).click()
  await page.goto("/cart")
  await page.getByRole("link", { name: "Proceed to checkout" }).filter({ visible: true }).first().click()
  await page.locator("#co-phone").fill(`98${info.project.name === "phone" ? "5" : "6"}0000001`)
  await page.locator("#co-name").fill("Back Test")
  await page.getByRole("button", { name: /^Place order/ }).click()
  await expect(page).toHaveURL(/\/order\/WS\d+/)
  await page.goBack()
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.getByRole("heading", { name: "Your cart is empty." })).toBeVisible()
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0)
})

test("a pincode fills the city, and typing the city again replaces it", async ({ page }) => {
  await page.goto("/p/cell-holder-18650")
  await page.locator("#buy-main").getByRole("button", { name: "Add to cart" }).click()
  await page.goto("/checkout")
  await page.getByText("₹80 delivery. Pay by UPI once we confirm.").click()
  await page.locator("#co-pincode").fill("400064")
  await page.locator("#co-pincode").blur()
  await expect(page.locator("#co-city")).toHaveValue("Mumbai")
  await page.locator("#co-city").focus()
  await page.keyboard.type("Mumbai")
  await expect(page.locator("#co-city")).toHaveValue("Mumbai")
})

test("a remembered vehicle shows on the home page, and its own page doesn't offer to filter for it", async ({ page }) => {
  await page.goto("/v/ola/s1")
  await page.getByRole("button", { name: "Remember my vehicle" }).click()
  await expect(page.getByRole("button", { name: /Filter for/ })).toHaveCount(0)
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Your Ola S1" })).toBeInViewport()
})

test("scrolling a listing never jumps backwards, and the product page keeps its height", async ({ page }) => {
  await page.goto("/c/batteries-bms")
  await expect(page.getByRole("navigation", { name: "Jump to section" })).toBeVisible()
  await page.evaluate(() => {
    document.body.dataset.ys = ""
    addEventListener("scroll", () => (document.body.dataset.ys = `${document.body.dataset.ys ?? ""}${String(scrollY)} `), { passive: true })
  })
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 150)
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(600)
  const ys = (await page.evaluate(() => document.body.dataset.ys ?? "")).trim().split(" ").map(Number)
  expect(ys.length).toBeGreaterThan(3)
  expect(ys.filter((y, i) => i > 0 && y < (ys[i - 1] ?? 0))).toEqual([])

  await page.goto("/p/disc-pad-dp13-ola-rear")
  const start = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 300)
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(start)
})
