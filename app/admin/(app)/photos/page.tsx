import { redirect } from "next/navigation"

export default function Photos() {
  redirect("/admin/products?view=photos")
}
