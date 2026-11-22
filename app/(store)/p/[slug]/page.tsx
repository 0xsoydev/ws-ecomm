import { Check, ChevronLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { Suspense } from "react"
import BuyBox from "@/components/BuyBox"
import Gallery from "@/components/Gallery"
import Placeholder from "@/components/Placeholder"
import PriceLines from "@/components/PriceLines"
import ProductTile from "@/components/ProductTile"
import { ProductSkeleton } from "@/components/Skeletons"
import StickyBar from "@/components/StickyBar"
import { badgeTone, stockBadge } from "@/components/stock-badge"
import WhatsAppLink from "@/components/WhatsAppLink"
import { isIndia } from "@/lib/catalog"
import { publicEnv } from "@/lib/env.public"
import { formatPaise, unitWord } from "@/lib/format"
import { breadcrumbs, jsonLd, productNode } from "@/lib/jsonld"
import { listingPrice, priceCopy } from "@/lib/pricing"
import { catalog, productPage, type ProductPage } from "@/lib/storefront"
import { code as codeClass } from "@/lib/ui"
import { askAboutPart, askForPhoto, photoHelp, waLink } from "@/lib/whatsapp"

export async function generateStaticParams() {
  const { tiles } = await catalog()
  return tiles.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const page = await productPage((await params).slug)
  if (!page || "redirect" in page) return {}
  const { tile } = page
  const title = page.seo.title ?? `${tile.code && !tile.name.includes(tile.code) ? `${tile.code} ${tile.name}` : tile.name} | WS Green, Malad West`
  return {
    title: { absolute: title },
    description: page.seo.description ?? `${tile.name}. ${priceCopy(tile.priced, tile.unit).main}. ${page.category.name}, pick up at Gulab Auto Garage, Malad West, Mumbai.`,
    alternates: { canonical: `/p/${tile.slug}` },
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
  if (tile.priced.minOrderQty > 1) facts.push(["Minimum order", `${String(tile.priced.minOrderQty)} ${unitWord(tile.unit, tile.priced.minOrderQty)}`])
  else if (tile.priced.moq > 1) facts.push(["Wholesale from", `${String(tile.priced.moq)} ${unitWord(tile.unit, tile.priced.moq)}`])
  if (tile.pickupOnly) facts.push(["Delivery", "Pickup only, or freight on quote"])
  return facts
}

async function Content({ params }: { params: PageProps<"/p/[slug]">["params"] }) {
  const page = await productPage((await params).slug)
  if (!page) notFound()
  if ("redirect" in page) permanentRedirect(`/p/${page.redirect}`)
  const { tile, legal, info } = page
  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${tile.slug}`
  const label = tile.code ?? tile.name
  const buyable = tile.purchasable && tile.stock.kind !== "out"
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
  if (page.images.length && tile.purchasable) {
    ld.push(
      productNode({
        name: tile.name,
        slug: tile.slug,
        code: tile.code,
        description: page.description || `${tile.name}. ${page.category.name}, sold by Gulab Auto Garage, Malad West, Mumbai.`,
        maker: page.maker,
        category: page.category.name,
        images: page.images,
        listing: listingPrice(tile.priced),
        unitCode: page.unitCode,
        inStock: tile.stock.kind !== "out",
        pickupOnly: tile.pickupOnly,
        fits: page.fits.filter((f) => f.verified).map((f) => f.label),
      }),
    )
  }

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          {page.images.length ? (
            <Gallery images={page.images} alt={tile.name} />
          ) : (
            <div className="flex flex-col items-start gap-2">
              <div className="aspect-square w-full overflow-hidden rounded-container">
                <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="pdp" />
              </div>
              <a href={waLink(askForPhoto(tile.code, tile.name, url))} target="_blank" rel="noopener" className="text-sm font-medium">
                Ask for a live photo
              </a>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="flex flex-col gap-1">
              {tile.code ? <span className={`text-[1.75rem] leading-[1.05] tracking-[-0.01em] [font-stretch:125%] lg:text-4xl ${codeClass}`}>{tile.code}</span> : null}
              <span className={tile.code ? "text-lg font-medium tracking-normal text-muted [font-stretch:100%]" : "text-2xl"}>{tile.name}</span>
            </h1>
            {badge ? <span className={`w-fit rounded-full border px-2.5 py-0.5 text-sm font-medium ${badgeTone[badge.tone]}`}>{badge.text}</span> : null}
          </div>

          {page.variants.length ? (
            <nav aria-label="Variants" className="flex flex-wrap gap-2">
              {page.variants.map((v) => (
                <Link
                  key={v.slug}
                  href={`/p/${v.slug}`}
                  aria-current={v.slug === tile.slug ? "page" : undefined}
                  className={`inline-flex h-11 items-center rounded-control border px-4 font-medium no-underline transition-colors duration-150 ease-out ${v.slug === tile.slug ? "border-ink border-2" : "border-line-strong bg-surface [@media(hover:hover)]:hover:bg-bg"}`}
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

          {buyable ? (
            <BuyBox id={tile.id} name={label} priced={tile.priced} unit={tile.unit} />
          ) : (
            <div className="flex flex-col gap-4">
              <PriceLines copy={priceCopy(tile.priced, tile.unit)} size="lg" />
              <div id="buy-main" className="flex flex-col gap-2">
                <WhatsAppLink text={askAboutPart(tile.code, tile.name, url)} variant="inkBig" className="w-full">
                  {tile.stock.kind === "out" ? "Ask on WhatsApp when it's back" : "Ask on WhatsApp about this part"}
                </WhatsAppLink>
                <p className="text-sm text-muted">Or buy at the shop in Malad West.</p>
              </div>
              <StickyBar targetId="buy-main" label={`Ask about ${label}`}>
                <div className="flex items-center gap-3">
                  <p className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate font-semibold">{priceCopy(tile.priced, tile.unit).main}</span>
                    <span className="truncate text-xs text-muted">{label}</span>
                  </p>
                  <WhatsAppLink text={askAboutPart(tile.code, tile.name, url)} variant="ink" className="ml-auto h-12 shrink-0">
                    Ask on WhatsApp
                  </WhatsAppLink>
                </div>
              </StickyBar>
            </div>
          )}

          <div className="flex flex-col gap-1 rounded-container border border-line bg-surface p-4 text-sm">
            <p>{tile.pickupOnly ? "Lithium parts can't go by courier. Pick up in Malad West, or ask us for a freight quote." : `We confirm within 1 hour (9 am to 10 pm). Pickup is ready soon after. ${info.scope}.`}</p>
            <p className="text-muted">Sold by {info.legalName} (WS Green), Malad West.</p>
          </div>

          <section aria-labelledby="facts" className={section}>
            <h2 id="facts" className="text-lg">
              Key facts
            </h2>
            <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
              {factsOf(page).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {page.specs.length ? (
            <section aria-labelledby="specs" className={section}>
              <h2 id="specs" className="text-lg">
                Specifications
              </h2>
              <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
                {page.specs.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

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

          {page.description ? (
            <section aria-labelledby="about" className={section}>
              <h2 id="about" className="text-lg">
                About this part
              </h2>
              <p className="max-w-[65ch] whitespace-pre-line">{page.description}</p>
            </section>
          ) : null}

          <section aria-label="Legal details" className="flex flex-col gap-1 border-t border-line pt-6 text-sm text-muted">
            <p>Country of origin: {legal.countryOfOrigin ?? "being confirmed"}.</p>
            {legal.maker ? (
              <p>
                {imported ? "Importer" : "Maker"}: {legal.maker}
                {legal.makerAddress ? `, ${legal.makerAddress}` : ""}.
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
              <p>Price inclusive of all charges.</p>
            )}
          </section>

          {buyable ? (
            <WhatsAppLink text={askAboutPart(tile.code, tile.name, url)} variant="secondary" className="self-start">
              Ask on WhatsApp about this part
            </WhatsAppLink>
          ) : null}
        </div>
      </div>

      {page.related.length ? (
        <section aria-labelledby="related" className="mt-14">
          <h2 id="related" className="text-xl">
            More in {page.category.name}
          </h2>
          <ul className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            {page.related.map((t) => (
              <li key={t.id} className="flex w-[44%] shrink-0 snap-start sm:w-auto">
                <ProductTile tile={t} sizes="(min-width: 640px) 25vw, 44vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
