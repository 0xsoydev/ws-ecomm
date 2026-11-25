import { asc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { requireRole, rolesOf } from "@/lib/auth"
import { db } from "@/lib/db"
import { categories, productImages, products, specsSchema, systems } from "@/lib/schema"
import { purchasableContext } from "@/lib/settings"
import { FitmentEditor } from "../vehicles/fitment-editor"
import { fitsByProduct, modelOptions } from "../vehicles/load"
import { ProductEditor } from "./product-editor"

export const metadata: Metadata = { title: "Edit product" }

export default function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<div aria-hidden className="mx-auto h-[70dvh] max-w-[1100px] animate-pulse rounded-container bg-surface" />}>
      <Editor params={params} />
    </Suspense>
  )
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const [{ user }, { id: raw }] = await Promise.all([requireRole("owner", "staff"), params])
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const [[product], cats, images, ctx, fits, models] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)),
    db
      .select({ id: categories.id, name: categories.name, system: systems.name })
      .from(categories)
      .innerJoin(systems, eq(systems.id, categories.systemId))
      .orderBy(asc(systems.position), asc(categories.position)),
    db.select({ id: productImages.id, publicId: productImages.publicId, ownPhoto: productImages.ownPhoto, classified: productImages.classified, onWhite: productImages.onWhite }).from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.position)),
    purchasableContext(),
    fitsByProduct(),
    modelOptions(),
  ])
  if (!product) notFound()
  const specs = specsSchema.safeParse(product.specs)
  return (
    <>
      <ProductEditor
        product={{ ...product, specs: specs.success ? specs.data : {}, bisVerifiedAt: product.bisVerifiedAt?.toISOString() ?? null, legacyName: product.legacyName }}
        categories={cats}
        images={images}
        ctx={ctx}
        isOwner={rolesOf(user.role).includes("owner")}
      />
      <section aria-labelledby="vehicles" className="mx-auto mt-8 flex max-w-[1100px] flex-col gap-3 border-t border-line pt-6">
        <h2 id="vehicles" className="text-lg">
          Vehicles
        </h2>
        <FitmentEditor productId={id} fits={fits.get(id) ?? []} models={models} />
      </section>
    </>
  )
}
