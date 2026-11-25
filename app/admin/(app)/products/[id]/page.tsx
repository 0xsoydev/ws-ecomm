import { and, asc, desc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { requireRole, rolesOf } from "@/lib/auth"
import { user } from "@/lib/auth-schema"
import { db } from "@/lib/db"
import { auditLog, categories, productImages, products, productVehicles, specsSchema, systems, vehicleBrands, vehicleModels } from "@/lib/schema"
import { purchasableContext } from "@/lib/settings"
import { ProductEditor } from "./product-editor"

export const metadata: Metadata = { title: "Edit product" }

export default function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[70dvh] animate-pulse rounded-container bg-surface" />}>
      <Editor params={params} />
    </Suspense>
  )
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const [{ user: me }, { id: raw }] = await Promise.all([requireRole("owner", "staff"), params])
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const [[product], cats, images, ctx, fits, models, history] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)),
    db
      .select({ id: categories.id, name: categories.name, system: systems.name })
      .from(categories)
      .innerJoin(systems, eq(systems.id, categories.systemId))
      .orderBy(asc(systems.position), asc(categories.position)),
    db
      .select({ id: productImages.id, publicId: productImages.publicId, ownPhoto: productImages.ownPhoto, watermarked: productImages.watermarked, onWhite: productImages.onWhite, classified: productImages.classified })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    purchasableContext(),
    db.select({ modelId: productVehicles.modelId, verified: productVehicles.verified, source: productVehicles.source }).from(productVehicles).where(eq(productVehicles.productId, id)),
    db
      .select({ id: vehicleModels.id, model: vehicleModels.name, brand: vehicleBrands.name })
      .from(vehicleModels)
      .innerJoin(vehicleBrands, eq(vehicleBrands.id, vehicleModels.brandId))
      .orderBy(asc(vehicleBrands.name), asc(vehicleModels.name)),
    db
      .select({ id: auditLog.id, at: auditLog.at, action: auditLog.action, diff: auditLog.diff, who: user.name })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .where(and(eq(auditLog.entity, "product"), eq(auditLog.entityId, String(id))))
      .orderBy(desc(auditLog.at))
      .limit(30),
  ])
  if (!product) notFound()
  const specs = specsSchema.safeParse(product.specs)
  return (
    <ProductEditor
      key={`${String(id)}-${product.updatedAt.toISOString()}`}
      product={{ ...product, specs: specs.success ? specs.data : {}, bisVerifiedAt: product.bisVerifiedAt?.toISOString() ?? null, updatedAt: product.updatedAt.toISOString() }}
      categories={cats}
      images={images}
      ctx={ctx}
      fits={fits}
      models={models.map((m) => ({ id: m.id, label: m.model.toLowerCase().startsWith(m.brand.toLowerCase()) ? m.model : `${m.brand} ${m.model}` }))}
      history={history.map((h) => ({ id: h.id, at: h.at.toISOString(), action: h.action, who: h.who ?? "System", diff: h.diff }))}
      isOwner={rolesOf(me.role).includes("owner")}
    />
  )
}
