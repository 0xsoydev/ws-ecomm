import { redirect } from "next/navigation"

export default function Pricing() {
  redirect("/admin/products?view=prices")
}
