import { Suspense } from "react"
import type { Catalog, Tile } from "@/lib/storefront"
import ListingClient, { ListingView, type ChipLink, type ListingSection, type VehicleOption } from "./ListingClient"
import ProductRow from "./ProductRow"
import ProductTile from "./ProductTile"

const SIZES = "(min-width: 1280px) 220px, (min-width: 640px) 30vw, 50vw"

export function vehicleOptions(models: Catalog["models"]): VehicleOption[] {
  return models.map((m) => ({ key: `${m.brandSlug}-${m.slug}`, id: m.id, label: m.name.toLowerCase().startsWith(m.brandName.toLowerCase()) ? m.name : `${m.brandName} ${m.name}` }))
}

export default function Listing({ groups, models, chips, showVehicleFacet = true }: { groups: { slug: string; name: string; tiles: Tile[] }[]; models: Catalog["models"]; chips: ChipLink[] | "spy"; showVehicleFacet?: boolean }) {
  const sections: ListingSection[] = groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    items: g.tiles.map((tile) => ({ tile, row: <ProductRow tile={tile} />, card: tile.purchasable ? <ProductTile tile={tile} sizes={SIZES} /> : null })),
  }))
  const vehicles = vehicleOptions(models)
  const props = { sections, vehicles, chips, showVehicleFacet }
  return (
    <Suspense fallback={<ListingView {...props} filter={{ vehicle: null, body: null, stock: false, sort: "recommended" }} vehicle={null} />}>
      <ListingClient {...props} />
    </Suspense>
  )
}
