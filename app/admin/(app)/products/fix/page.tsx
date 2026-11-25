import { redirect } from "next/navigation"

export default function Fix() {
  redirect("/admin/products?view=fix")
}
