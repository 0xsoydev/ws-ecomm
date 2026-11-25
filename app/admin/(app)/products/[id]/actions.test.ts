import type { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { afterAll, beforeAll, expect, test, vi } from "vitest"
import { serve } from "@/e2e/db"

const PORT = 55900 + Math.floor(Math.random() * 90)
let role = "owner"

vi.mock("next/cache", () => ({ updateTag: () => undefined, refresh: () => undefined }))
vi.mock("@/lib/auth", () => ({
  requireRole: () => Promise.resolve({ user: { id: "e2e-owner", role } }),
  rolesOf: (r: string) => r.split(","),
}))

let server: PGLiteSocketServer
let saveProduct: typeof import("./actions").saveProduct
let sql: (q: string) => Promise<Record<string, unknown>[]>
let load: (id: number) => Promise<import("./actions").SaveInput>

beforeAll(async () => {
  server = await serve(PORT)
  vi.stubEnv("DATABASE_URL", `postgres://postgres@127.0.0.1:${String(PORT)}/postgres`)
  saveProduct = (await import("./actions")).saveProduct
  const { db } = await import("@/lib/db")
  const { asc, eq, sql: raw } = await import("drizzle-orm")
  const { productImages, products, productVehicles } = await import("@/lib/schema")
  sql = async (q) => (await db.execute(raw.raw(q))).rows
  load = async (id) => {
    const [p] = await db.select().from(products).where(eq(products.id, id))
    if (!p) throw new Error("no product")
    const photos = await db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.position))
    const fits = await db.select().from(productVehicles).where(eq(productVehicles.productId, id))
    return {
      ...p,
      partCode: p.partCode ?? "",
      maker: p.maker ?? "",
      makerAddress: p.makerAddress ?? "",
      netQuantity: p.netQuantity ?? "",
      bisRegistration: p.bisRegistration ?? "",
      bisVerified: p.bisVerifiedAt !== null,
      bin: p.bin ?? "",
      hsn: p.hsn ?? "",
      gstRateBps: p.gstRateBps as 0,
      specs: p.specs,
      counted: p.stock !== null,
      stock: p.stock ?? 0,
      stockSeen: p.stock,
      stockNote: "",
      expectedUpdatedAt: p.updatedAt.toISOString(),
      photos: photos.map(({ id: photoId, ownPhoto, watermarked, onWhite, classified }) => ({ id: photoId, ownPhoto, watermarked, onWhite, classified })),
      removedPhotos: [],
      fits: fits.map(({ modelId, verified }) => ({ modelId, verified })),
    }
  }
}, 60000)

afterAll(async () => {
  await (await import("@/lib/db")).db.$client.end()
  await server.stop()
})

test("one save writes fields, photos and vehicles together, with history", async () => {
  role = "owner"
  await sql("insert into product_image (product_id, public_id, width, height, position, own_photo, on_white, classified) values (7, 'catalogue-app/extra', 1000, 1000, 1, false, false, false)")
  const base = await load(7)
  const [first, second] = base.photos
  if (!first || !second) throw new Error("two photos expected")
  const result = await saveProduct({
    ...base,
    name: "Lever Ola Drum Pair",
    retailPaise: 26000,
    photos: [{ ...second, ownPhoto: true, classified: true }, first],
    fits: base.fits.map((f) => ({ ...f, verified: true })),
  })
  expect(result).toEqual({ ok: true })
  expect(await sql("select name, retail_paise from product where id = 7")).toEqual([{ name: "Lever Ola Drum Pair", retail_paise: 26000 }])
  expect(await sql("select public_id, position, own_photo, classified from product_image where product_id = 7 order by position")).toEqual([
    { public_id: "catalogue-app/extra", position: 0, own_photo: true, classified: true },
    { public_id: expect.any(String) as string, position: 1, own_photo: true, classified: true },
  ])
  expect(await sql("select verified from product_vehicle where product_id = 7")).toEqual([{ verified: true }])
  expect((await sql("select action from audit_log where entity = 'product' and entity_id = '7' order by id")).map((r) => r.action)).toEqual(["price", "content"])
  expect(await sql("select retail_paise from price_history where product_id = 7")).toEqual([{ retail_paise: 26000 }])
})

test("a stale save is refused as a conflict and changes nothing", async () => {
  role = "owner"
  const base = await load(6)
  expect(await saveProduct({ ...base, name: "First Save" })).toEqual({ ok: true })
  const stale = await saveProduct({ ...base, name: "Second Save" })
  expect(stale).toMatchObject({ ok: false, conflict: true })
  expect(await sql("select name from product where id = 6")).toEqual([{ name: "First Save" }])
})

test("staff can edit content but not prices", async () => {
  role = "staff"
  const base = await load(5)
  expect(await saveProduct({ ...base, wholesalePaise: 7000 })).toMatchObject({ ok: false, message: expect.stringContaining("Only the owner") as string })
  expect(await sql("select wholesale_paise from product where id = 5")).toEqual([{ wholesale_paise: 6500 }])
  expect(await saveProduct({ ...base, aliases: "cell frame" })).toEqual({ ok: true })
})

test("retail below wholesale and an unexplained stock change are refused", async () => {
  role = "owner"
  const base = await load(6)
  expect(await saveProduct({ ...base, retailPaise: 11000 })).toMatchObject({ ok: false, message: expect.stringContaining("below the wholesale") as string })
  const counted = await load(2)
  expect(await saveProduct({ ...counted, stock: 5 })).toMatchObject({ ok: false, message: expect.stringContaining("why the stock changed") as string })
  expect(await saveProduct({ ...counted, stock: 5, stockNote: "Recounted" })).toEqual({ ok: true })
  expect(await sql("select delta, reason from stock_movement where product_id = 2")).toEqual([{ delta: 3, reason: "correction" }])
})

test("a wrong photo is removed on save and recorded in history", async () => {
  role = "staff"
  await sql("insert into product_image (product_id, public_id, width, height, position) values (3, 'catalogue-app/wrong-part', 1000, 1000, 1)")
  const base = await load(3)
  const wrong = base.photos.find((p, i) => i === 1)
  if (!wrong) throw new Error("second photo expected")
  expect(await saveProduct({ ...base, photos: base.photos.filter((p) => p.id !== wrong.id), removedPhotos: [wrong.id] })).toEqual({ ok: true })
  expect(await sql("select public_id from product_image where product_id = 3")).toHaveLength(1)
  expect(JSON.stringify(await sql("select diff from audit_log where entity_id = '3' and action = 'content'"))).toContain("catalogue-app/wrong-part")
  const again = await load(3)
  expect(await saveProduct({ ...again, photos: [], removedPhotos: [] })).toMatchObject({ ok: false, conflict: true })
})
