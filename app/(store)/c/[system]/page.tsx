import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Listing from "@/components/Listing"
import PageHead from "@/components/PageHead"
import { ListingSkeleton } from "@/components/Skeletons"
import { breadcrumbs, itemList, jsonLd } from "@/lib/jsonld"
import { catalog } from "@/lib/storefront"

export const ensureStatic = "navigation"

export async function generateStaticParams() {
  const { systems } = await catalog()
  return systems.map((s) => ({ system: s.slug }))
}

async function load(slug: string) {
  const data = await catalog()
  const system = data.systems.find((s) => s.slug === slug)
  return system ? { data, system } : null
}

export async function generateMetadata({ params }: PageProps<"/c/[system]">): Promise<Metadata> {
  const found = await load((await params).system)
  if (!found) return { title: "Page not found" }
  return {
    title: `${found.system.name} for electric scooters in Mumbai`,
    description: found.system.blurb || `${found.system.name}: ${String(found.system.count)} parts with counter prices. Pick up at Gulab Auto Garage, Malad West, Mumbai.`,
    alternates: { canonical: `/c/${found.system.slug}` },
  }
}

export default function SystemPage({ params }: PageProps<"/c/[system]">) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

async function Content({ params }: { params: PageProps<"/c/[system]">["params"] }) {
  const found = await load((await params).system)
  if (!found) notFound()
  const { data, system } = found
  const groups = data.categories
    .filter((c) => c.systemId === system.id)
    .map((c) => ({ slug: c.slug, name: c.name, href: `/c/${system.slug}/${c.slug}`, tiles: data.tiles.filter((t) => t.categoryId === c.id) }))
    .filter((g) => g.tiles.length > 0)
  const buyable = groups.some((g) => g.tiles.some((t) => t.purchasable))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([breadcrumbs([{ name: system.name, path: `/c/${system.slug}` }]), itemList(system.name, groups.flatMap((g) => g.tiles))])} />
      <PageHead back={{ href: "/", label: "Home" }} title={system.name}>
        {system.blurb ? <p className="max-w-[60ch] text-muted">{system.blurb}</p> : null}
        {buyable ? null : <p className="max-w-[60ch] text-sm text-muted">Buy these at the shop in Malad West, or ask on WhatsApp for stock and a live photo.</p>}
      </PageHead>
      <Listing groups={groups} models={data.models} chips="spy" />
    </>
  )
}
