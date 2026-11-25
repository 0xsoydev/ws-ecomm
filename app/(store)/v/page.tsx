import type { Metadata } from "next"
import Link from "next/link"
import { vehicleOptions } from "@/components/Listing"
import PageHead from "@/components/PageHead"
import WhatsAppLink from "@/components/WhatsAppLink"
import { partsCount } from "@/lib/format"
import { catalog } from "@/lib/storefront"
import { photoHelp } from "@/lib/whatsapp"
import BrandRail from "@/components/BrandRail"
import { brandTiles } from "@/lib/brands"

export const metadata: Metadata = { title: "Parts by vehicle", description: "EV scooter parts for Ola, Ather, TVS, Bajaj Chetak, Hero Vida, Ampere, Okinawa, Komaki, Revolt and more at Gulab Auto Garage, Malad West, Mumbai.", alternates: { canonical: "/v" } }

export default async function VehiclesPage() {
  const data = await catalog()
  const labels = new Map(vehicleOptions(data.models).map((v) => [v.id, v.label]))
  const count = (id: number) => data.tiles.filter((t) => t.vehicles.some((v) => v.modelId === id)).length
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Home" }} title="Parts by vehicle">
        <p className="max-w-[60ch] text-muted">Pick your scooter to see the parts we sell for it.</p>
      </PageHead>
      <div className="mt-4 flex flex-col gap-8">
        <div className="-mx-4 sm:mx-0">
          <BrandRail brands={brandTiles(data)} title="Brands" />
        </div>
        <h2 className="-mb-5 text-lg">Models</h2>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {data.models.filter((m) => count(m.id) > 0).map((m) => (
            <li key={m.id}>
              <Link
                href={`/v/${m.brandSlug}/${m.slug}`}
                className="flex min-h-20 flex-col justify-between gap-2 rounded-container border border-line bg-surface p-3.5 no-underline transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] [@media(hover:hover)]:hover:bg-bg"
              >
                <span className="flex flex-col">
                  <span className="text-xs text-muted">{m.brandName}</span>
                  <span className="font-semibold">{labels.get(m.id)}</span>
                </span>
                <span className="text-xs text-muted">{partsCount(count(m.id))}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-start gap-3 border-t border-line pt-6">
          <p className="text-muted">Scooter not listed, or not sure which part you need?</p>
          <WhatsAppLink text={photoHelp(null)} variant="secondary">
            Send a photo on WhatsApp
          </WhatsAppLink>
        </div>
      </div>
    </div>
  )
}
