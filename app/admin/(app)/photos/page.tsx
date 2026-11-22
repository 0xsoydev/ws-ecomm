import { asc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { Suspense } from "react"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { productImages, products } from "@/lib/schema"
import { PhotoSorter } from "./photo-sorter"

export const metadata: Metadata = { title: "Photos" }

export default function PhotosPage() {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">Photos</h1>
        <p className="max-w-[60ch] text-muted">Only photos marked Ours appear on the store. Photos with another seller&apos;s watermark are never shown.</p>
      </div>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <Photos />
      </Suspense>
    </div>
  )
}

async function Photos() {
  await requireRole("owner", "staff")
  const rows = await db
    .select({
      id: productImages.id,
      publicId: productImages.publicId,
      ownPhoto: productImages.ownPhoto,
      watermarked: productImages.watermarked,
      onWhite: productImages.onWhite,
      classified: productImages.classified,
      position: productImages.position,
      productId: products.id,
      name: products.name,
      sku: products.sku,
    })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .orderBy(asc(products.sku), asc(productImages.position))
  return <PhotoSorter photos={rows} />
}
