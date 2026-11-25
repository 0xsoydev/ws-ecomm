import { expect, test } from "@playwright/test"
import { OWNER } from "./constants"

test("staff confirm a pickup order, mark it ready and hand it over", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one admin run is enough")
  await page.goto("/p/disc-pad-dp13-ola-rear")
  await page.getByRole("radio", { name: /2 or more/ }).click()
  await page.locator("#buy-main").getByRole("button", { name: "Add to cart" }).click()
  await page.goto("/checkout")
  await page.locator("#co-phone").fill("9830000009")
  await page.locator("#co-name").fill("Counter Test")
  await page.getByText("Pick up at the shop", { exact: true }).click()
  await page.getByText("Pay at the shop", { exact: true }).click()
  await page.locator("button[type=submit]").click()
  await expect(page).toHaveURL(/\/order\/WS\d+/)
  const number = page.url().split("/").pop() ?? ""

  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(OWNER.email)
  await page.getByLabel("Password").fill(OWNER.password)
  await page.getByRole("button", { name: "Sign in with password" }).click()
  await expect(page).toHaveURL(/\/admin$/)

  await page.goto("/admin/orders")
  await page.getByRole("link", { name: new RegExp(number) }).click()
  await page.getByRole("button", { name: "Confirm order" }).click()
  await expect(page.getByRole("button", { name: "Mark ready for pickup" })).toBeVisible()
  await page.getByRole("button", { name: "Mark ready for pickup" }).click()
  await page.getByRole("button", { name: "Paid and picked up" }).click()
  await expect(page.getByText(/Picked up\./).filter({ visible: true })).toBeVisible()

  await page.goto("/admin/settings")
  await page.getByLabel("Minimum order (₹)").fill("150")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Settings saved").filter({ visible: true })).toBeVisible()
})

test("a product is checked and saved in one place, old screens land on its list view", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one admin run is enough")
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(OWNER.email)
  await page.getByLabel("Password").fill(OWNER.password)
  await page.getByRole("button", { name: "Sign in with password" }).click()
  await expect(page).toHaveURL(/\/admin$/)

  for (const [old, view] of [["/admin/photos", "photos"], ["/admin/products/pricing", "prices"], ["/admin/products/fix", "fix"], ["/admin/products/vehicles", "vehicles"]]) {
    await page.goto(old ?? "")
    await expect(page).toHaveURL(new RegExp(`/admin/products\\?view=${view ?? ""}$`))
  }

  await page.getByRole("link", { name: /Lever Ola drum/ }).click()
  await expect(page).toHaveURL(/\/admin\/products\/7\?view=vehicles$/)
  await expect(page.getByRole("heading", { level: 1, name: "Lever Ola drum" })).toBeVisible()

  await page.getByRole("button", { name: "Fits", exact: true }).click()
  await page.getByLabel("Other names customers search for").fill("brake lever, lever set")
  await expect(page.getByText("Unsaved changes")).toBeVisible()
  page.once("dialog", (d) => void d.dismiss())
  await page.getByRole("button", { name: /^All/ }).click()
  await page.getByRole("link", { name: /Daly BMS/ }).click()
  await expect(page).toHaveURL(/\/admin\/products\/7/)

  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("All changes saved")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Other names customers search for")).toHaveValue("brake lever, lever set")
  await expect(page.getByText("Sold for, to check")).toHaveCount(0)
})
