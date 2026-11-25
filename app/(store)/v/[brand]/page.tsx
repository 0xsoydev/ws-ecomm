import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Listing, { vehicleOptions } from "@/components/Listing"
import PageHead from "@/components/PageHead"
import { ListingSkeleton } from "@/components/Skeletons"
import { partsCount } from "@/lib/format"
import { breadcrumbs, itemList, jsonLd } from "@/lib/jsonld"
import { catalog, vehicleTiles } from "@/lib/storefront"
import { chip } from "@/lib/ui"
import WhatsAppLink from "@/components/WhatsAppLink"
import { LOGOS } from "@/lib/brands"

export const ensureStatic = "navigation"

export async function generateStaticParams() {
  const { models } = await catalog()
  return [...new Set(models.map((m) => m.brandSlug))].map((brand) => ({ brand }))
}

async function load(brand: string) {
  const data = await catalog()
  const models = data.models.filter((m) => m.brandSlug === brand)
  const first = models[0]
  if (!first) return null
  return { name: first.brandName, models, tiles: vehicleTiles(data, models.map((m) => m.id)) }
}

export async function generateMetadata({ params }: PageProps<"/v/[brand]">): Promise<Metadata> {
  const { brand } = await params
  const found = await load(brand)
  if (!found) return { title: "Page not found" }
  return {
    title: `${found.name} EV spare parts in Mumbai`,
    description: `${partsCount(found.tiles.length)} for ${found.models.map((m) => vehicleOptions([m])[0]?.label).join(", ")} at Gulab Auto Garage, Malad West, Mumbai.`,
    alternates: { canonical: found.models.length === 1 && found.models[0] ? `/v/${brand}/${found.models[0].slug}` : `/v/${brand}` },
    robots: found.tiles.length ? undefined : { index: false, follow: true },
  }
}

export default function BrandPage({ params }: PageProps<"/v/[brand]">) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

async function Content({ params }: { params: PageProps<"/v/[brand]">["params"] }) {
  const { brand } = await params
  const found = await load(brand)
  if (!found) notFound()
  const { name, models, tiles } = found
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([breadcrumbs([{ name: "Vehicles", path: "/v" }, { name, path: `/v/${brand}` }]), itemList(`${name} parts`, tiles)])} />
      <PageHead back={{ href: "/v", label: "Vehicles" }} title={`${name} parts`}>
        {LOGOS.has(brand) ? (
          <span
            aria-hidden
            className="block h-9 w-40 bg-muted [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain]"
            style={{ maskImage: `url(/brands/${brand}.svg)`, WebkitMaskImage: `url(/brands/${brand}.svg)` }}
          />
        ) : null}
        <ul aria-label={`${name} models`} className="flex flex-wrap gap-2">
          {vehicleOptions(models).map((v) => (
            <li key={v.key}>
              <Link href={v.href as `/v/${string}`} className={`${chip(false)} h-11 no-underline`}>
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </PageHead>
      {tiles.length ? (
        <Listing groups={[{ slug: "brand", name: `${name} parts`, tiles }]} models={models} chips={[]} />
      ) : (
        <div className="mt-2 flex max-w-[60ch] flex-col items-start gap-4 rounded-container border border-line bg-surface p-5">
          <p>We haven&rsquo;t listed parts for {name} scooters yet, but we service and source them at the shop. Send a photo of the part you need and we&rsquo;ll check.</p>
          <WhatsAppLink text={`Hi, I need a part for my ${name} scooter. Photo attached.`} variant="ink">
            Send a photo on WhatsApp
          </WhatsAppLink>
        </div>
      )}
    </>
  )
}
