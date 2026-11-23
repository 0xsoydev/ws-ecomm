import type { Metadata, Route } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Listing from "@/components/Listing"
import PageHead from "@/components/PageHead"
import { ListingSkeleton } from "@/components/Skeletons"
import { breadcrumbs, itemList, jsonLd } from "@/lib/jsonld"
import { catalog } from "@/lib/storefront"

export const ensureStatic = "navigation"

export async function generateStaticParams() {
  const { systems, categories } = await catalog()
  return categories.flatMap((c) => {
    const s = systems.find((x) => x.id === c.systemId)
    return s && c.count > 0 ? [{ system: s.slug, category: c.slug }] : []
  })
}

async function load(systemSlug: string, categorySlug: string) {
  const data = await catalog()
  const system = data.systems.find((s) => s.slug === systemSlug)
  const category = system ? data.categories.find((c) => c.systemId === system.id && c.slug === categorySlug) : undefined
  return system && category ? { data, system, category } : null
}

export async function generateMetadata({ params }: PageProps<"/c/[system]/[category]">): Promise<Metadata> {
  const p = await params
  const found = await load(p.system, p.category)
  if (!found) return { title: "Page not found" }
  return {
    title: `${found.category.name} for electric scooters in Mumbai`,
    description: `${found.category.name}: ${String(found.category.count)} parts with counter prices at Gulab Auto Garage, Malad West, Mumbai.`,
    alternates: { canonical: `/c/${found.system.slug}/${found.category.slug}` },
  }
}

export default function CategoryPage({ params }: PageProps<"/c/[system]/[category]">) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

async function Content({ params }: { params: PageProps<"/c/[system]/[category]">["params"] }) {
  const p = await params
  const found = await load(p.system, p.category)
  if (!found) notFound()
  const { data, system, category } = found
  const tiles = data.tiles.filter((t) => t.categoryId === category.id)
  const siblings = data.categories.filter((c) => c.systemId === system.id && c.count > 0)
  const chips = [{ href: `/c/${system.slug}`, label: "All", active: false }, ...siblings.map((c) => ({ href: `/c/${system.slug}/${c.slug}`, label: c.name, active: c.id === category.id }))]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([breadcrumbs([{ name: system.name, path: `/c/${system.slug}` }, { name: category.name, path: `/c/${system.slug}/${category.slug}` }]), itemList(category.name, tiles)])} />
      <PageHead back={{ href: `/c/${system.slug}` as Route, label: system.shortName }} title={category.name}>
        {category.blurb ? <p className="max-w-[60ch] text-muted">{category.blurb}</p> : null}
        {tiles.some((t) => t.purchasable) ? null : <p className="max-w-[60ch] text-sm text-muted">Buy these at the shop in Malad West, or ask on WhatsApp for stock and a live photo.</p>}
      </PageHead>
      <Listing groups={[{ slug: category.slug, name: category.name, tiles }]} models={data.models} chips={chips} />
    </>
  )
}
