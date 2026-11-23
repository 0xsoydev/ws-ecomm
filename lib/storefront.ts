import "server-only"
import { and, asc, desc, eq, isNotNull } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"
import { isPurchasable } from "./catalog"
import { db } from "./db"
import { deliveryScope } from "./delivery"
import { env } from "./env"
import { collectsTax, interStateAllowed, isRegistered, regimeAt } from "./gst"
import type { Priced } from "./pricing"
import { categories, productImages, products, productVehicles, slugRedirects, systems, units, vehicleBrands, vehicleModels } from "./schema"
import { searchTerms } from "./search"
import { getSettings } from "./settings"
import { todayInIndia } from "./time"

export type StockState = { kind: "untracked" } | { kind: "out" } | { kind: "low"; left: number } | { kind: "in" }
export type PublicImage = { publicId: string; width: number; height: number; alt: string; onWhite: boolean }

export type Tile = {
  id: number
  slug: string
  code: string | null
  name: string
  unit: string
  priced: Priced
  purchasable: boolean
  compliant: boolean
  approved: boolean
  stock: StockState
  pickupOnly: boolean
  image: PublicImage | null
  categoryId: number
  systemSlug: string
  bodyStyle: (typeof products.$inferSelect)["bodyStyle"]
  vehicles: { modelId: number; verified: boolean }[]
  terms: string
  context: string
}

export type System = { id: number; slug: string; name: string; shortName: string; blurb: string; count: number }
export type Category = { id: number; systemId: number; slug: string; name: string; blurb: string; count: number }
export type Model = { id: number; brandId: number; slug: string; name: string; brandSlug: string; brandName: string }

export async function storeInfo() {
  "use cache"
  cacheTag("settings")
  cacheLife("days")
  const [s, regime] = await Promise.all([getSettings(), regimeAt(todayInIndia())])
  return {
    weeklyHours: s.weeklyHours,
    specialHours: s.specialHours,
    scope: deliveryScope(s, interStateAllowed(regime.scheme), env.SHIPROCKET_MODE),
    pickupOnly: !s.courierAvailable && s.localDeliveryPincodes.length === 0 && env.SHIPROCKET_MODE === "off",
    collectsTax: collectsTax(regime.scheme),
    gstin: isRegistered(regime.scheme) ? regime.gstin : null,
    legalName: s.legalName,
    minOrderPaise: s.minOrderPaise,
    shippingBands: s.shippingBands,
    freeShippingFromPaise: s.freeShippingFromPaise,
    reviewLink: s.reviewLink,
    grievanceOfficer: s.grievanceOfficer,
  }
}

function stockState(stock: number | null, lowAt: number): StockState {
  if (stock === null) return { kind: "untracked" }
  if (stock <= 0) return { kind: "out" }
  if (stock <= lowAt) return { kind: "low", left: stock }
  return { kind: "in" }
}

export async function catalog() {
  "use cache"
  cacheTag("catalog", "settings")
  cacheLife("max")
  const [settings, regime, systemRows, categoryRows, modelRows, productRows, imageRows, fitRows] = await Promise.all([
    getSettings(),
    regimeAt(todayInIndia()),
    db.select().from(systems).orderBy(asc(systems.position)),
    db.select().from(categories).orderBy(asc(categories.position)),
    db
      .select({ id: vehicleModels.id, brandId: vehicleModels.brandId, slug: vehicleModels.slug, name: vehicleModels.name, aliases: vehicleModels.aliases, brandSlug: vehicleBrands.slug, brandName: vehicleBrands.name })
      .from(vehicleModels)
      .innerJoin(vehicleBrands, eq(vehicleBrands.id, vehicleModels.brandId))
      .orderBy(asc(vehicleBrands.name), asc(vehicleModels.name)),
    db.select().from(products).where(eq(products.status, "active")).orderBy(asc(products.sku)),
    db
      .select({ productId: productImages.productId, publicId: productImages.publicId, width: productImages.width, height: productImages.height, alt: productImages.alt, onWhite: productImages.onWhite })
      .from(productImages)
      .orderBy(desc(productImages.ownPhoto), asc(productImages.position)),
    db.select().from(productVehicles),
  ])
  const ctx = { collectsTax: collectsTax(regime.scheme), eprRegistration: settings.eprRegistration, packStandard: settings.certifications.packStandard }
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]))
  const systemById = new Map(systemRows.map((s) => [s.id, s]))
  const modelById = new Map(modelRows.map((m) => [m.id, m]))
  const firstImage = new Map<number, PublicImage>()
  for (const img of imageRows) {
    if (firstImage.has(img.productId)) continue
    firstImage.set(img.productId, { publicId: img.publicId, width: img.width, height: img.height, alt: img.alt, onWhite: img.onWhite })
  }
  const fits = new Map<number, { modelId: number; verified: boolean }[]>()
  for (const f of fitRows) fits.set(f.productId, [...(fits.get(f.productId) ?? []), { modelId: f.modelId, verified: f.verified }])

  const tiles: Tile[] = []
  for (const p of productRows) {
    const category = categoryById.get(p.categoryId)
    const system = category ? systemById.get(category.systemId) : undefined
    if (!category || !system) continue
    const vehicles = (fits.get(p.id) ?? []).sort((a, b) => Number(b.verified) - Number(a.verified))
    const reviewedSpecs = p.specsReviewed ? Object.values(p.specs) : []
    tiles.push({
      id: p.id,
      slug: p.slug,
      code: p.partCode,
      name: p.name,
      unit: p.unit,
      priced: { retailPaise: p.retailPaise, wholesalePaise: p.wholesalePaise, moq: p.moq, minOrderQty: p.minOrderQty, orderStep: p.orderStep },
      purchasable: p.stock !== 0,
      compliant: isPurchasable(p, ctx),
      approved: p.priceApproved,
      stock: stockState(p.stock, p.lowStockAt ?? settings.lowStockDefault),
      pickupOnly: p.fulfilment === "pickup_or_freight",
      image: firstImage.get(p.id) ?? null,
      categoryId: category.id,
      systemSlug: system.slug,
      bodyStyle: p.bodyStyle,
      vehicles,
      terms: searchTerms([
        p.partCode,
        p.mpn,
        p.name,
        p.aliases,
        p.maker,
        ...vehicles.flatMap((v) => {
          const m = modelById.get(v.modelId)
          return m ? [m.brandName, m.name, m.aliases] : []
        }),
        ...reviewedSpecs,
      ]),
      context: searchTerms([category.name, system.name, system.shortName]),
    })
  }

  const countBy = (key: (t: Tile) => number | string) => {
    const counts = new Map<number | string, number>()
    for (const t of tiles) counts.set(key(t), (counts.get(key(t)) ?? 0) + 1)
    return counts
  }
  const perCategory = countBy((t) => t.categoryId)
  const perSystem = countBy((t) => t.systemSlug)

  return {
    systems: systemRows.map((s): System => ({ id: s.id, slug: s.slug, name: s.name, shortName: s.shortName, blurb: s.blurb, count: perSystem.get(s.slug) ?? 0 })),
    categories: categoryRows.map((c): Category => ({ id: c.id, systemId: c.systemId, slug: c.slug, name: c.name, blurb: c.blurb, count: perCategory.get(c.id) ?? 0 })),
    models: modelRows.map((m): Model => ({ id: m.id, brandId: m.brandId, slug: m.slug, name: m.name, brandSlug: m.brandSlug, brandName: m.brandName })),
    tiles,
  }
}

export type Catalog = Awaited<ReturnType<typeof catalog>>

export const VEHICLE_INDEX_MIN = 4

export function vehicleTiles(data: Catalog, modelIds: readonly number[]) {
  return data.tiles.filter((t) => t.vehicles.some((v) => modelIds.includes(v.modelId)))
}

export async function productPage(slug: string) {
  "use cache"
  cacheLife("max")
  const data = await catalog()
  const tile = data.tiles.find((t) => t.slug === slug)
  if (!tile) {
    cacheTag("catalog")
    const [moved] = await db.select({ slug: products.slug }).from(slugRedirects).innerJoin(products, eq(products.id, slugRedirects.productId)).where(eq(slugRedirects.fromSlug, slug))
    return moved ? { redirect: moved.slug } : null
  }
  cacheTag(`product:${String(tile.id)}`, "catalog", "settings")
  const [[row], [unit], images, info] = await Promise.all([
    db.select().from(products).where(eq(products.id, tile.id)),
    db.select({ unitCode: units.unitCode }).from(units).where(eq(units.code, tile.unit)),
    db
      .select({ publicId: productImages.publicId, width: productImages.width, height: productImages.height, alt: productImages.alt, onWhite: productImages.onWhite })
      .from(productImages)
      .where(eq(productImages.productId, tile.id))
      .orderBy(desc(productImages.ownPhoto), asc(productImages.position)),
    storeInfo(),
  ])
  if (!row) return null
  const category = data.categories.find((c) => c.id === tile.categoryId)
  const system = data.systems.find((x) => x.slug === tile.systemSlug)
  if (!category || !system) return null
  const variants = row.groupKey
    ? await db
        .select({ slug: products.slug, label: products.variantLabel, name: products.name })
        .from(products)
        .where(and(eq(products.groupKey, row.groupKey), eq(products.status, "active"), isNotNull(products.variantLabel)))
        .orderBy(asc(products.variantLabel))
    : []
  const modelById = new Map(data.models.map((m) => [m.id, m]))
  const related = data.tiles
    .filter((t) => t.categoryId === tile.categoryId && t.id !== tile.id)
    .sort((a, b) => Number(b.purchasable) - Number(a.purchasable) || Number(b.image !== null) - Number(a.image !== null))
    .slice(0, 8)
  return {
    tile,
    images: images satisfies PublicImage[],
    category: { slug: category.slug, name: category.name },
    system: { slug: system.slug, name: system.name, shortName: system.shortName },
    variants: variants.length > 1 ? variants.map((v) => ({ slug: v.slug, label: v.label ?? v.name })) : [],
    fits: tile.vehicles.flatMap((v) => {
      const m = modelById.get(v.modelId)
      return m ? [{ key: `${m.brandSlug}-${m.slug}`, brandSlug: m.brandSlug, slug: m.slug, label: m.name.toLowerCase().startsWith(m.brandName.toLowerCase()) ? m.name : `${m.brandName} ${m.name}`, verified: v.verified }] : []
    }),
    specs: row.specsReviewed ? Object.entries(row.specs) : [],
    description: row.copyReviewed ? row.description : "",
    legal: {
      countryOfOrigin: row.countryOfOrigin,
      maker: row.maker,
      makerAddress: row.makerAddress,
      prePackaged: row.prePackaged,
      netQuantity: row.netQuantity,
      mrpPaise: row.mrpPaise,
      bisRegistration: row.batteryKind === "cell" ? row.bisRegistration : null,
      hsn: info.collectsTax ? row.hsn : null,
      gstRateBps: info.collectsTax ? row.gstRateBps : null,
    },
    seo: { title: row.seoTitle, description: row.seoDescription },
    unitCode: unit?.unitCode ?? "C62",
    maker: row.maker,
    sku: row.sku,
    related,
    info,
  }
}

export type ProductPage = NonNullable<Exclude<Awaited<ReturnType<typeof productPage>>, { redirect: string }>>
