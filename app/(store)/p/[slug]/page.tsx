import { Check, ChevronLeft, ShieldCheck, Store, Truck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { Suspense } from "react"
import BuyBox from "@/components/BuyBox"
import Gallery from "@/components/Gallery"
import Placeholder from "@/components/Placeholder"
import ProductCard from "@/components/ProductCard"
import { ProductSkeleton } from "@/components/Skeletons"
import { badgeTone, stockBadge } from "@/components/stock-badge"
import WhatsAppIcon from "@/components/WhatsAppIcon"
import { RETURNS } from "@/lib/business"
import { isIndia } from "@/lib/catalog"
import { publicEnv } from "@/lib/env.public"
import { formatPaise, unitWord } from "@/lib/format"
import { breadcrumbs, jsonLd, productNode } from "@/lib/jsonld"
import { codeMissing } from "@/lib/search"
import { hasRetailTier, minQty, priceCopy } from "@/lib/pricing"
import { catalog, productPage, type ProductPage } from "@/lib/storefront"
import { button } from "@/lib/ui"
import { askAboutPart, photoHelp, waLink } from "@/lib/whatsapp"

export const ensureStatic = "navigation"

export async function generateStaticParams() {
  const { tiles } = await catalog()
  return tiles.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const page = await productPage((await params).slug)
  if (!page) return { title: "Page not found" }
  if ("redirect" in page) return {}
  const { tile } = page
  const base = codeMissing(tile.name, tile.code) ? `${tile.name} ${tile.code}` : tile.name
  const vehicle = page.fits[0]?.label
  const title = page.seo.title ?? `${base}${vehicle && !base.toLowerCase().includes(vehicle.toLowerCase()) ? ` for ${vehicle}` : ""}, ${priceCopy(tile.priced, tile.unit).main} | WS Green Mumbai`
  const description = page.seo.description ?? `${priceCopy(tile.priced, tile.unit).main}. ${summaryOf(page)}`.slice(0, 300)
  const image = page.images[0]
  const og = image ? `https://res.cloudinary.com/${publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_white/${image.publicId}` : undefined
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/p/${tile.slug}` },
    openGraph: { title: base, description, type: "website", url: `/p/${tile.slug}`, siteName: "WS Green", images: og ? [{ url: og, width: 1200, height: 630, alt: tile.name }] : undefined },
    robots: page.images.length ? undefined : { index: false, follow: true },
  }
}

export default function ProductRoute({ params }: PageProps<"/p/[slug]">) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Suspense fallback={<ProductSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

function factsOf(page: ProductPage) {
  const { tile } = page
  const facts: [string, string][] = []
  if (tile.code) facts.push(["Part code", tile.code])
  facts.push(["Category", page.category.name])
  facts.push(["Sold per", unitWord(tile.unit, 1)])
  const min = minQty(tile.priced)
  if (min > 1) facts.push(["Minimum order", `${String(min)} ${unitWord(tile.unit, min)}`])
  if (tile.priced.retailPaise !== null && hasRetailTier(tile.priced)) facts.push(["Wholesale from", `${String(tile.priced.moq)} ${unitWord(tile.unit, tile.priced.moq)}`])
  if (tile.pickupOnly) facts.push(["Delivery", "Pickup only, or freight on quote"])
  return facts
}

function summaryOf(page: ProductPage) {
  const { tile } = page
  const min = minQty(tile.priced)
  const fits = page.fits.map((f) => f.label)
  const parts = [
    `${tile.name}${codeMissing(tile.name, tile.code) ? ` (part code ${tile.code})` : ""} is in our ${page.category.name} range for electric two-wheelers.`,
    page.maker ? `Made by ${page.maker}.` : null,
    fits.length ? `Sold for the ${fits.join(", ")}. Check it against your old part, or send us a photo on WhatsApp before ordering.` : "Check it against your old part, or send us a photo on WhatsApp before ordering.",
    `Sold per ${unitWord(tile.unit, 1)}${min > 1 ? `, minimum ${String(min)} ${unitWord(tile.unit, min)} per order` : ""}.`,
    tile.priced.retailPaise !== null && hasRetailTier(tile.priced) ? `Buy ${String(tile.priced.moq)} or more and every piece is charged at the wholesale price.` : null,
    tile.pickupOnly ? "This part cannot go by courier: pick it up at the shop in Malad West, or ask us for a transport quote." : "Pick it up at Gulab Auto Garage in Malad West, or get it delivered within Maharashtra.",
  ]
  return parts.filter((x) => x !== null).join(" ")
}

async function Content({ params }: { params: PageProps<"/p/[slug]">["params"] }) {
  const page = await productPage((await params).slug)
  if (!page) notFound()
  if ("redirect" in page) permanentRedirect(`/p/${page.redirect}`)
  const { tile, legal, info } = page
  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${tile.slug}`
  const badge = stockBadge(tile)
  const imported = legal.countryOfOrigin !== null && !isIndia(legal.countryOfOrigin)
  const section = "flex flex-col gap-3 border-t border-line pt-6"
  const ld: object[] = [
    breadcrumbs([
      { name: page.system.name, path: `/c/${page.system.slug}` },
      { name: page.category.name, path: `/c/${page.system.slug}/${page.category.slug}` },
      { name: tile.name, path: `/p/${tile.slug}` },
    ]),
  ]
  if (page.images.length && tile.compliant) {
    ld.push(
      productNode({
        name: tile.name,
        slug: tile.slug,
        code: tile.code,
        sku: page.sku,
        description: page.description || summaryOf(page),
        maker: page.maker,
        category: page.category.name,
        images: page.images,
        unitPaise: tile.priced.retailPaise ?? tile.priced.wholesalePaise,
        minQty: minQty(tile.priced),
        unitCode: page.unitCode,
        inStock: tile.stock.kind !== "out",
        pickupOnly: tile.pickupOnly,
        fits: page.fits.filter((f) => f.verified).map((f) => f.label),
        specs: page.specs,
        countryOfOrigin: legal.countryOfOrigin,
      }),
    )
  }
  const delivery = tile.pickupOnly ? "Lithium parts can't go by courier. Pick up in Malad West, or ask for a freight quote." : info.pickupOnly ? "Pick up at the shop in Malad West." : `${info.scope}, or pick up in Malad West.`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <nav aria-label="Breadcrumb" className="pt-3 pb-3 text-sm lg:pt-6">
        <ol className="flex flex-wrap items-center gap-1 text-muted">
          <li>
            <Link href={`/c/${page.system.slug}`} className="-ml-1 flex items-center gap-0.5 py-1 no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink">
              <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
              {page.system.shortName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/c/${page.system.slug}/${page.category.slug}`} className="py-1 no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink">
              {page.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          {page.images.length ? (
            <Gallery images={page.images} alt={tile.name} />
          ) : (
            <div className="aspect-square w-full overflow-hidden rounded-container">
              <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="pdp" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            {tile.code || page.maker ? (
              <p className="flex flex-wrap gap-x-4 text-sm text-muted">
                {page.maker ? <span>{page.maker}</span> : null}
                {tile.code ? <span>Code {tile.code}</span> : null}
              </p>
            ) : null}
            <h1 className="text-2xl leading-tight tracking-[-0.015em] lg:text-3xl">{tile.name}</h1>
            {badge ? <span className={`w-fit rounded-full border px-2.5 py-0.5 text-sm font-medium ${badgeTone[badge.tone]}`}>{badge.text}</span> : null}
          </div>

          {page.variants.length ? (
            <nav aria-label="Variants" className="flex flex-wrap gap-2">
              {page.variants.map((v) => (
                <Link
                  key={v.slug}
                  href={`/p/${v.slug}`}
                  aria-current={v.slug === tile.slug ? "page" : undefined}
                  className={`inline-flex h-11 items-center rounded-control border px-4 font-medium no-underline transition-colors duration-150 ease-out ${v.slug === tile.slug ? "border-2 border-ink" : "border-line-strong bg-surface [@media(hover:hover)]:hover:bg-bg"}`}
                >
                  {v.label}
                </Link>
              ))}
            </nav>
          ) : null}

          {page.fits.length ? (
            <p className="text-sm">
              {page.fits.some((f) => f.verified) ? (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Check aria-hidden className="size-4" strokeWidth={2.25} />
                  Fits {page.fits.filter((f) => f.verified).map((f) => f.label).join(", ")}
                </span>
              ) : (
                <>
                  Sold for {page.fits.map((f) => f.label).join(", ")}.{" "}
                  <a href={waLink(photoHelp(page.fits[0]?.label ?? null))} target="_blank" rel="noopener" className="font-medium">
                    Not sure? Send a photo
                  </a>
                </>
              )}
            </p>
          ) : null}

          {tile.purchasable ? (
            <BuyBox id={tile.id} name={tile.name} priced={tile.priced} unit={tile.unit} minOrderPaise={info.minOrderPaise} />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-3xl font-semibold tracking-[-0.01em] text-muted">{priceCopy(tile.priced, tile.unit).main}</p>
              <p>This part is out of stock.</p>
              <a href={waLink(askAboutPart(tile.code, tile.name, url))} target="_blank" rel="noopener" className={`${button.inkBig} no-underline`}>
                <WhatsAppIcon className="size-5" />
                Ask when it&rsquo;s back
              </a>
            </div>
          )}

          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-2">
              {tile.pickupOnly || info.pickupOnly ? <Store aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted" strokeWidth={1.75} /> : <Truck aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted" strokeWidth={1.75} />}
              {delivery}
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted" strokeWidth={1.75} />
              <span>
                Faulty? Tell us within {RETURNS.faultyDays} days and we replace or refund it. Wrong part? Return it unused within {RETURNS.wrongPartDays} days.{" "}
                <Link href="/pages/returns" className="font-medium">
                  Returns policy
                </Link>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Store aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted" strokeWidth={1.75} />
              <span>
                Sold by Gulab Auto Garage, a repair shop in Malad West for over 10 years.
                {info.reviewLink ? (
                  <>
                    {" "}
                    <a href={info.reviewLink} target="_blank" rel="noopener noreferrer" className="font-medium">
                      Read our Google reviews
                    </a>
                  </>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <WhatsAppIcon className="mt-0.5 size-4.5 shrink-0 text-muted" />
              <span>
                Questions about this part?{" "}
                <a href={waLink(askAboutPart(tile.code, tile.name, url))} target="_blank" rel="noopener" className="font-medium">
                  Ask on WhatsApp
                </a>
              </span>
            </li>
          </ul>

          <section aria-labelledby="facts" className={section}>
            <h2 id="facts" className="text-lg">
              Details
            </h2>
            <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
              {[...factsOf(page), ...page.specs].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {page.fits.length ? (
            <section aria-labelledby="fits" className={section}>
              <h2 id="fits" className="text-lg">
                Vehicles
              </h2>
              <ul className="flex flex-wrap gap-2">
                {page.fits.map((f) => (
                  <li key={f.key}>
                    <Link href={`/v/${f.brandSlug}/${f.slug}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-line-strong bg-surface px-3 text-sm no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-bg">
                      {f.verified ? <Check aria-hidden className="size-3.5" strokeWidth={2.25} /> : null}
                      {f.verified ? "Fits" : "Sold for"} {f.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="about" className={section}>
            <h2 id="about" className="text-lg">
              About this part
            </h2>
            <p className="max-w-[65ch] whitespace-pre-line">{page.description || summaryOf(page)}</p>
          </section>

          <section aria-label="Legal details" className="flex flex-col gap-1 border-t border-line pt-6 text-xs text-muted">
            <p>Sold by {info.legalName} (WS Green), Malad West, Mumbai.</p>
            {legal.countryOfOrigin ? <p>Country of origin: {legal.countryOfOrigin}.</p> : null}
            {legal.maker ? (
              <p>
                {imported ? "Importer" : "Maker"}: {`${legal.maker}${legal.makerAddress ? `, ${legal.makerAddress}` : ""}`.replace(/\.*$/, ".")}
              </p>
            ) : null}
            {legal.prePackaged && legal.mrpPaise !== null ? <p>MRP {formatPaise(legal.mrpPaise)} incl. of all taxes.</p> : null}
            {legal.prePackaged && legal.netQuantity ? <p>Net quantity: {legal.netQuantity}.</p> : null}
            {legal.bisRegistration ? <p>BIS registration: {legal.bisRegistration}.</p> : null}
            {legal.hsn && legal.gstRateBps !== null ? (
              <p>
                HSN {legal.hsn}. GST {legal.gstRateBps / 100}% included.
              </p>
            ) : (
              <p>Price includes all taxes. Delivery is charged separately.</p>
            )}
          </section>
        </div>
      </div>

      {page.related.length ? (
        <section aria-labelledby="related" className="mt-14">
          <h2 id="related" className="text-xl">
            More in {page.category.name}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {page.related.slice(0, 8).map((t) => (
              <li key={t.id} className="flex">
                <ProductCard tile={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
