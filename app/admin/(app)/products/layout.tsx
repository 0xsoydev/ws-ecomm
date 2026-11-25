import { Suspense } from "react"
import { requireRole, rolesOf } from "@/lib/auth"
import { loadProductRows } from "./load"
import { ProductList } from "./product-list"

export default function ProductsLayout({ children }: LayoutProps<"/admin/products">) {
  return (
    <div className="mx-auto max-w-[1440px] xl:grid xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start xl:gap-8">
      <Suspense fallback={<div aria-hidden className="h-[70dvh] animate-pulse rounded-container bg-surface" />}>
        <List />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

async function List() {
  const { user } = await requireRole("owner", "staff")
  return <ProductList rows={await loadProductRows()} isOwner={rolesOf(user.role).includes("owner")} />
}
