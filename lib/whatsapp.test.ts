import { expect, test } from "vitest"
import { partsList, waLink } from "./whatsapp"

test("links carry the shop number and encode the text", () => {
  expect(waLink("Hi & bye?")).toBe("https://wa.me/919821784847?text=Hi%20%26%20bye%3F")
})

test("parts list reads like the counter slip", () => {
  const text = partsList(
    [
      { code: "LB2 OVAL", name: "LED bulb LB2 oval, 48V", qty: 2, unit: "pcs", unitPaise: 18000, wholesale: false },
      { code: null, name: "Dim switch", qty: 5, unit: "pcs", unitPaise: 2600, wholesale: true },
    ],
    "Pick up in Malad West",
  )
  expect(text).toBe(
    "Parts list\n2 pcs LB2 OVAL (LED bulb LB2 oval, 48V), ₹180 each = ₹360\n5 pcs Dim switch, ₹26 each, wholesale = ₹130\nItems ₹490\nPick up in Malad West",
  )
})
