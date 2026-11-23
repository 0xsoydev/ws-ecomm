import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const paths = ["/", "/c/batteries-bms", "/c/batteries-bms/bms-48v", "/p/disc-pad-dp13-ola-rear", "/search?q=bms", "/search?q=ola", "/cart", "/checkout", "/pages/returns", "/v", "/v/ola", "/v/ola/s1", "/prices", "/wholesale", "/nope"]

for (const scheme of ["light", "dark"] as const) {
  for (const path of paths) {
    test(`no accessibility problems on ${path} in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze()
      const found = result.violations.filter((v) => v.impact !== "minor")
      expect(found.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([])
    })
  }
}

test("the card Add button shows a visible focus ring", async ({ page }) => {
  await page.goto("/c/batteries-bms")
  await page.waitForLoadState("networkidle")
  const add = page.getByRole("button", { name: /^Add .* to cart$/ }).filter({ visible: true }).first()
  await page.keyboard.press("Tab")
  await add.focus()
  await expect(add).toBeFocused()
  expect(await add.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
  const style = await add.evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(style).not.toBe("none")
})
