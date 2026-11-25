import "server-only"
import { asc, eq, sql } from "drizzle-orm"
import { purchasableIssues } from "@/lib/catalog"
import { db } from "@/lib/db"
import { categories, productImages, products, systems } from "@/lib/schema"
import { purchasableContext } from "@/lib/settings"

export async function loadProductRows() {
  const [rows, ctx] = await Promise.all([
    db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        partCode: products.partCode,
        status: products.status,
        system: systems.shortName,
        category: categories.name,
        unit: products.unit,
        stock: products.stock,
        moq: products.moq,
        wholesalePaise: products.wholesalePaise,
        retailPaise: products.retailPaise,
        maker: products.maker,
        makerAddress: products.makerAddress,
        prePackaged: products.prePackaged,
        netQuantity: products.netQuantity,
        mrpPaise: products.mrpPaise,
        batteryKind: products.batteryKind,
        bisRegistration: products.bisRegistration,
        bisVerifiedAt: products.bisVerifiedAt,
        priceApproved: products.priceApproved,
        hsn: products.hsn,
        photo: sql<string | null>`(select i.public_id from ${productImages} i where i.product_id = ${products.id} order by i.own_photo desc, i.position limit 1)`,
        ownPhoto: sql<boolean>`exists (select 1 from ${productImages} i where i.product_id = ${products.id} and i.own_photo)`,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .innerJoin(systems, eq(systems.id, categories.systemId))
      .orderBy(asc(products.sku)),
    purchasableContext(),
  ])
  return rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    partCode: r.partCode,
    status: r.status,
    system: r.system,
    category: r.category,
    unit: r.unit,
    stock: r.stock,
    moq: r.moq,
    wholesalePaise: r.wholesalePaise,
    retailPaise: r.retailPaise,
    priceApproved: r.priceApproved,
    maker: r.maker,
    makerAddress: r.makerAddress,
    prePackaged: r.prePackaged,
    photo: r.photo,
    ownPhoto: r.ownPhoto,
    issues: purchasableIssues(r, ctx),
  }))
}

export type ProductRow = Awaited<ReturnType<typeof loadProductRows>>[number]
