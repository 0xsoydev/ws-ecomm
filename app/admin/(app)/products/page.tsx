import type { Metadata } from "next"
import { Suspense } from "react"
import { requireRole } from "@/lib/auth"
import { loadProductRows } from "./load"
import { ProductList } from "./product-list"

export const metadata: Metadata = { title: "Products" }

export default function ProductsPage() {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <h1 className="text-2xl">Products</h1>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <List />
      </Suspense>
    </div>
  )
}

async function List() {
  await requireRole("owner", "staff")
  return <ProductList rows={await loadProductRows()} />
}
