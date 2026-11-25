import { redirect } from "next/navigation"

export default function Vehicles() {
  redirect("/admin/products?view=vehicles")
}
