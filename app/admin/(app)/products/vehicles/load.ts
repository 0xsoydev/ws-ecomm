import "server-only"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { productVehicles, vehicleBrands, vehicleModels } from "@/lib/schema"

export type Fit = { modelId: number; verified: boolean; source: string }
export type ModelOption = { id: number; label: string }

export async function modelOptions(): Promise<ModelOption[]> {
  const rows = await db
    .select({ id: vehicleModels.id, model: vehicleModels.name, brand: vehicleBrands.name })
    .from(vehicleModels)
    .innerJoin(vehicleBrands, eq(vehicleBrands.id, vehicleModels.brandId))
    .orderBy(asc(vehicleBrands.name), asc(vehicleModels.name))
  return rows.map((r) => ({ id: r.id, label: r.model.toLowerCase().startsWith(r.brand.toLowerCase()) ? r.model : `${r.brand} ${r.model}` }))
}

export async function fitsByProduct(): Promise<Map<number, Fit[]>> {
  const rows = await db.select().from(productVehicles)
  const map = new Map<number, Fit[]>()
  for (const r of rows) map.set(r.productId, [...(map.get(r.productId) ?? []), { modelId: r.modelId, verified: r.verified, source: r.source }])
  return map
}
