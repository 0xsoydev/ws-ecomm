import { ChevronRight, MapPin, Store } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { vehicleOptions } from "@/components/Listing"
import BrandRail from "@/components/BrandRail"
import OpenStatus from "@/components/OpenStatus"
import Placeholder from "@/components/Placeholder"
import ProductCard from "@/components/ProductCard"
import ProductImage from "@/components/ProductImage"
import WhatsAppLink from "@/components/WhatsAppLink"
import YourVehicle from "@/components/YourVehicle"
import { brandTiles } from "@/lib/brands"
import { jsonLd, localBusiness, website } from "@/lib/jsonld"
import { catalog, storeInfo, type Tile } from "@/lib/storefront"
import { button } from "@/lib/ui"

export const metadata: Metadata = { alternates: { canonical: "/" } }

const FLAGSHIP = "batteries-bms"
const PER_RAIL = 6

function ranked(tiles: Tile[]) {
  return tiles
    .map((t, i) => ({ t, i }))
    .sort((a, b) => Number(b.t.purchasable) - Number(a.t.purchasable) || Number(b.t.image !== null) - Number(a.t.image !== null) || a.i - b.i)
    .map((r) => r.t)
}

export default async function Home() {
  const [data, info] = await Promise.all([catalog(), storeInfo()])
  const bySystem = new Map(data.systems.map((s) => [s.slug, ranked(data.tiles.filter((t) => t.systemSlug === s.slug))]))
  const rails = [...data.systems]
    .filter((s) => s.count > 0)
    .sort((a, b) => Number(b.slug === FLAGSHIP) - Number(a.slug === FLAGSHIP) || b.count - a.count)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([website(), localBusiness(info.weeklyHours, info.scope)])} />

      <nav aria-label="Shop by category" className="mx-auto max-w-[1200px] pt-4 sm:px-6 lg:pt-8">
        <ul className="flex snap-x snap-proximity scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-8 sm:overflow-visible sm:px-0">
          {data.systems.map((s) => {
            const lead = bySystem.get(s.slug)?.find((t) => t.image)
            return (
              <li key={s.slug} className="w-[22%] shrink-0 snap-start sm:w-auto">
                <Link href={`/c/${s.slug}`} prefetch={true} className="group flex flex-col items-center gap-2 text-center no-underline">
                  <span className="relative aspect-square w-full overflow-hidden rounded-container border border-line bg-well transition-transform duration-200 ease-out group-active:scale-[0.97]">
                    {lead?.image ? <ProductImage image={lead.image} alt="" sizes="(min-width: 640px) 130px, 22vw" /> : <Placeholder systemSlug={s.slug} code={null} size="tile" />}
                  </span>
                  <span className="text-xs leading-tight font-medium text-balance sm:text-sm [@media(hover:hover)]:group-hover:underline">{s.shortName}</span>
                </Link>
              </li>
            )
          })}
          <li aria-hidden className="w-1 shrink-0 sm:hidden" />
        </ul>
      </nav>

      <section className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 lg:pt-12">
        <h1 className="max-w-[22ch] text-2xl leading-[1.1] tracking-[-0.02em] sm:text-3xl lg:text-4xl">Spare parts for electric scooters</h1>
        <p className="mt-2 max-w-[62ch] text-muted">
          BMS boards, controllers, lights, brakes and body parts, sold by Gulab Auto Garage in Malad West. {info.pickupOnly ? "Pick up at the shop." : `${info.scope}, or pick up at the shop.`}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          <li className="flex items-center gap-1.5">
            <Store aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
            <OpenStatus weekly={info.weeklyHours} special={info.specialHours} />
          </li>
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
            <Link href="/store" className="no-underline [@media(hover:hover)]:hover:underline">
              Near Milap Theatre, Malad West
            </Link>
          </li>
          {info.reviewLink ? (
            <li>
              <a href={info.reviewLink} target="_blank" rel="noopener noreferrer" className="font-medium">
                Google reviews
              </a>
            </li>
          ) : null}
        </ul>
      </section>

      <div className="mx-auto mt-8 flex max-w-[1200px] flex-col gap-2 sm:px-6">
        <div className="px-4 empty:hidden sm:px-0">
          <YourVehicle options={vehicleOptions(data.models)} />
        </div>
        <BrandRail brands={brandTiles(data)} moving />
      </div>

      {rails.map((s) => (
        <section key={s.slug} aria-labelledby={`rail-${s.slug}`} className="mx-auto mt-10 max-w-[1200px] sm:px-6">
          <div className="flex items-baseline justify-between gap-4 px-4 sm:px-0">
            <h2 id={`rail-${s.slug}`} className="text-xl">
              {s.name}
            </h2>
            <Link href={`/c/${s.slug}`} className="flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-medium no-underline [@media(hover:hover)]:hover:underline">
              See all {s.count}
              <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
            </Link>
          </div>
          <ul className="mt-3 flex snap-x snap-proximity scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
            {(bySystem.get(s.slug) ?? []).slice(0, PER_RAIL).map((t, i) => (
              <li key={t.id} className={`flex w-[44%] shrink-0 snap-start sm:w-auto ${i >= 5 ? "lg:hidden" : ""} ${i >= 6 ? "sm:hidden" : ""}`}>
                <ProductCard tile={t} sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 44vw" />
              </li>
            ))}
            <li aria-hidden className="w-1 shrink-0 sm:hidden" />
          </ul>
        </section>
      ))}

      <section aria-labelledby="wholesale" className="mx-auto mt-12 max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-container border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
          <div className="flex max-w-[56ch] flex-col gap-1.5">
            <h2 id="wholesale" className="text-xl">
              Wholesale prices for garages and fleets
            </h2>
            <p className="text-muted">Buy a part&rsquo;s break quantity and every piece is charged at the wholesale price. No account needed. Send your list for a bulk quote.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <WhatsAppLink text="Hi, I want a bulk quote for these parts:" variant="ink">
              Send a list
            </WhatsAppLink>
            <Link href="/wholesale" className={`${button.secondary} no-underline`}>
              How wholesale works
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
