import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

for (const path of ["/", "/c/batteries-bms", "/p/disc-pad-dp13-ola-rear", "/search?q=bms", "/cart", "/checkout", "/pages/returns", "/v"]) {
  test(`no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([])
  })
}
