import { asc, inArray } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { productImages, products } from "@/lib/schema"
import { Thumb } from "../product-list"
import { FitmentEditor } from "./fitment-editor"
import { fitsByProduct, modelOptions } from "./load"

export const metadata: Metadata = { title: "Vehicles to check" }

export default function VehiclesPage() {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">Vehicles to check</h1>
        <p className="max-w-[65ch] text-sm text-muted">Each part was tagged from online research; the source is under each vehicle. Mark it Fits when you are sure, or remove it. Until then the shop shows &ldquo;Sold for&rdquo; instead of &ldquo;Fits&rdquo;.</p>
      </div>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <List />
      </Suspense>
    </div>
  )
}

async function List() {
  await requireRole("owner", "staff")
  const [fits, models] = await Promise.all([fitsByProduct(), modelOptions()])
  const ids = [...fits.entries()].filter(([, f]) => f.some((x) => !x.verified)).map(([id]) => id)
  if (!ids.length) return <p className="py-12 text-center text-muted">Every vehicle tag is checked.</p>
  const [rows, images] = await Promise.all([
    db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, ids)).orderBy(asc(products.name)),
    db.select({ productId: productImages.productId, publicId: productImages.publicId, own: productImages.ownPhoto }).from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.position)),
  ])
  const photo = new Map<number, { publicId: string; own: boolean }>()
  for (const i of images) if (!photo.has(i.productId)) photo.set(i.productId, { publicId: i.publicId, own: i.own })
  return (
    <>
      <p className="text-sm text-muted">
        {rows.length} {rows.length === 1 ? "part" : "parts"} to check
      </p>
      <ul className="flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-container border border-line bg-surface p-4 sm:flex-row">
            <div className="flex items-start gap-3 sm:w-64 sm:shrink-0">
              <Thumb publicId={photo.get(r.id)?.publicId ?? null} own={photo.get(r.id)?.own ?? true} />
              <Link href={`/admin/products/${String(r.id)}`} className="font-semibold">
                {r.name}
              </Link>
            </div>
            <div className="min-w-0 flex-1">
              <FitmentEditor productId={r.id} fits={fits.get(r.id) ?? []} models={models} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
