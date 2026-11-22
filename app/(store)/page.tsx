import { ChevronRight, MapPin, Phone, Wrench } from "lucide-react"
import Link from "next/link"
import HeroSearch from "@/components/HeroSearch"
import ProductImage from "@/components/ProductImage"
import SystemIcon from "@/components/SystemIcon"
import WhatsAppLink from "@/components/WhatsAppLink"
import { jsonLd, localBusiness, website } from "@/lib/jsonld"
import { searchProducts } from "@/lib/search"
import { catalog, storeInfo } from "@/lib/storefront"
import { hoursSummary } from "@/lib/time"
import { button } from "@/lib/ui"
import { bookService, photoHelp, telLink, waLink } from "@/lib/whatsapp"

const HERO_CODES = ["13S 100A", "SB50", "DP13 Ola rear", "6200 HD", "PLS 123", "LED LB1"]
const DIRECTIONS = "https://www.google.com/maps/search/?api=1&query=Gulab%20Auto%20Garage%2C%20Malad%20West%2C%20Mumbai"

export default async function Home() {
  const [data, info] = await Promise.all([catalog(), storeInfo()])
  const phrases = HERO_CODES.filter((c) => searchProducts(data.tiles, c, 1).length > 0)
  const brands = [...new Map(data.models.map((m) => [m.brandSlug, m.brandName])).entries()]
  const systemImage = new Map(data.tiles.filter((t) => t.image).map((t) => [t.systemSlug, t.image]))
  const withImages = data.systems.every((s) => systemImage.has(s.slug))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([website(), localBusiness(info.weeklyHours, info.scope)])} />
      <section className="mx-auto max-w-[1200px] px-4 pt-6 pb-10 sm:px-6 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pt-16 lg:pb-16">
        <div className="flex max-w-[640px] flex-col gap-5">
          <h1 className="text-[2rem] leading-[1.05] tracking-[-0.025em] [font-stretch:118%] sm:text-4xl lg:text-[3.5rem]">EV spare parts, BMS and controllers. Counter prices.</h1>
          <HeroSearch phrases={phrases} />
          <p className="max-w-[52ch] text-sm text-muted sm:text-base">
            We confirm within 1 hour (9 am to 10 pm). Pickup is ready soon after. {info.scope}.
          </p>
        </div>
        <aside aria-labelledby="shop-desktop" className="mt-10 hidden flex-col gap-4 self-end rounded-container border border-line bg-surface p-6 lg:flex">
          <StoreLines id="shop-desktop" hours={hoursSummary(info.weeklyHours)} />
        </aside>
      </section>

      <section aria-labelledby="systems" className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <h2 id="systems" className="sr-only">
          Parts by system
        </h2>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {data.systems.map((s) => {
            const image = withImages ? systemImage.get(s.slug) : undefined
            return (
              <li key={s.slug}>
                <Link
                  href={`/c/${s.slug}`}
                  prefetch={true}
                  className="group flex h-full min-h-28 flex-col justify-between gap-4 rounded-container border border-line bg-surface p-3.5 no-underline transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] sm:min-h-36 sm:p-4 [@media(hover:hover)]:hover:bg-bg"
                >
                  {image ? (
                    <span className="relative -m-1 size-16 overflow-hidden rounded-control bg-well">
                      <ProductImage image={image} alt="" sizes="64px" />
                    </span>
                  ) : null}
                  {image ? null : <SystemIcon slug={s.slug} className="size-7 text-muted transition-colors duration-150 ease-out sm:size-8 [@media(hover:hover)]:group-hover:text-ink" strokeWidth={1.25} />}
                  <span className="flex flex-col">
                    <span className="leading-tight font-semibold [font-stretch:108%]">{s.shortName}</span>
                    <span className="text-xs text-muted">{s.count} parts</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="vehicles" className="mx-auto mt-12 max-w-[1200px] sm:px-6">
        <div className="flex items-baseline justify-between px-4 sm:px-0">
          <h2 id="vehicles" className="text-xl">
            Shop by vehicle
          </h2>
          <Link href="/v" className="text-sm font-medium">
            All vehicles
          </Link>
        </div>
        <ul className="mt-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0">
          {brands.map(([slug, name]) => (
            <li key={slug} className="snap-start">
              <Link
                href={`/v#${slug}`}
                className="inline-flex h-11 items-center rounded-full border border-line-strong bg-surface px-4 font-medium whitespace-nowrap no-underline transition-colors duration-150 ease-out active:bg-bg [@media(hover:hover)]:hover:bg-bg"
              >
                {name}
              </Link>
            </li>
          ))}
          <li aria-hidden className="w-2 shrink-0 sm:hidden" />
        </ul>
        <p className="mt-4 px-4 text-sm text-muted sm:px-0">
          Not sure which part fits?{" "}
          <a href={waLink(photoHelp(null))} target="_blank" rel="noopener" className="font-medium text-ink">
            Send a photo on WhatsApp
          </a>
        </p>
      </section>

      <section aria-labelledby="wholesale" className="mx-auto mt-14 max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-[56ch] flex-col gap-2">
            <h2 id="wholesale" className="text-xl">
              Buying in bulk? The price drops at the wholesale break.
            </h2>
            <p className="text-muted">Every part shows its break quantity. Buy that many or more and every piece is charged at the wholesale price, no account needed.</p>
          </div>
          <Link href="/wholesale" className={`${button.secondary} self-start no-underline sm:self-auto`}>
            How wholesale works
          </Link>
        </div>
      </section>

      <section aria-labelledby="shop" className="mx-auto mt-14 max-w-[1200px] px-4 sm:px-6 lg:hidden">
        <div className="flex flex-col gap-4 rounded-container border border-line bg-surface p-5">
          <StoreLines id="shop" hours={hoursSummary(info.weeklyHours)} />
        </div>
      </section>

      <section aria-labelledby="workshop" className="mx-auto mt-10 max-w-[1200px] px-4 sm:px-6 lg:mt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Wrench aria-hidden className="mt-1 size-5 shrink-0 text-muted" strokeWidth={1.5} />
            <div className="flex flex-col gap-1">
              <h2 id="workshop" className="text-xl">
                Workshop
              </h2>
              <p className="max-w-[52ch] text-muted">BMS repair, controller swap and battery checks. We repair all two-wheelers, electric and petrol.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <WhatsAppLink text={bookService("a repair", null)} variant="secondary">
              Book on WhatsApp
            </WhatsAppLink>
            <Link href="/service" className={`${button.secondary} no-underline`}>
              Services
              <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function StoreLines({ id, hours }: { id: string; hours: string }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-xl">
          Gulab Auto Garage, Malad West
        </h2>
        <p className="text-muted">Repairing two-wheelers for over 10 years. Walk in for parts and repairs.</p>
      </div>
      <address className="flex gap-2 not-italic">
        <MapPin aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted" strokeWidth={1.75} />
        <span>
          1 Akshardham Complex, near Milap Theatre, S.V. Road, Malad West, Mumbai 400064
          <br />
          <span className="text-muted">{hours}</span>
        </span>
      </address>
      <div className="flex flex-wrap gap-2">
        <a href={DIRECTIONS} target="_blank" rel="noopener" className={`${button.ink} no-underline`}>
          <MapPin aria-hidden className="size-4.5" strokeWidth={1.75} />
          Directions
        </a>
        <a href={telLink} className={`${button.secondary} no-underline`}>
          <Phone aria-hidden className="size-4.5" strokeWidth={1.75} />
          Call
        </a>
      </div>
    </>
  )
}
