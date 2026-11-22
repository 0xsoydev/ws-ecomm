import { asc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { Suspense } from "react"
import { requireRole, rolesOf } from "@/lib/auth"
import { db } from "@/lib/db"
import { categories, products, systems } from "@/lib/schema"
import { PricingSheet } from "./pricing-sheet"

export const metadata: Metadata = { title: "Prices" }

export default function PricingPage() {
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5">
      <h1 className="text-2xl">Prices</h1>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <Sheet />
      </Suspense>
    </div>
  )
}

async function Sheet() {
  const { user } = await requireRole("owner", "staff")
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      partCode: products.partCode,
      unit: products.unit,
      system: systems.shortName,
      moq: products.moq,
      minOrderQty: products.minOrderQty,
      orderStep: products.orderStep,
      wholesalePaise: products.wholesalePaise,
      retailPaise: products.retailPaise,
      proposedRetailPaise: products.proposedRetailPaise,
      mrpPaise: products.mrpPaise,
      priceApproved: products.priceApproved,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .innerJoin(systems, eq(systems.id, categories.systemId))
    .where(eq(products.status, "active"))
    .orderBy(asc(products.sku))
  return <PricingSheet rows={rows} canApprove={rolesOf(user.role).includes("owner")} />
}
