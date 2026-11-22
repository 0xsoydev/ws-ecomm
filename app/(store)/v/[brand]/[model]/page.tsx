import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Listing, { vehicleOptions } from "@/components/Listing"
import PageHead from "@/components/PageHead"
import RememberVehicle from "@/components/RememberVehicle"
import { ListingSkeleton } from "@/components/Skeletons"
import { catalog } from "@/lib/storefront"

export async function generateStaticParams() {
  const { models } = await catalog()
  return models.map((m) => ({ brand: m.brandSlug, model: m.slug }))
}

async function load(brand: string, model: string) {
  const data = await catalog()
  const m = data.models.find((x) => x.brandSlug === brand && x.slug === model)
  if (!m) return null
  const option = vehicleOptions([m])[0]
  if (!option) return null
  const tiles = data.tiles.filter((t) => t.vehicles.some((v) => v.modelId === m.id))
  const verified = tiles.filter((t) => t.vehicles.some((v) => v.modelId === m.id && v.verified))
  return { data, m, option, tiles, verified, rest: tiles.filter((t) => !verified.includes(t)) }
}

export async function generateMetadata({ params }: PageProps<"/v/[brand]/[model]">): Promise<Metadata> {
  const p = await params
  const found = await load(p.brand, p.model)
  if (!found) return {}
  return {
    title: `Parts for ${found.option.label}`,
    description: `${String(found.tiles.length)} parts sold for the ${found.option.label} at Gulab Auto Garage, Malad West, Mumbai.`,
    alternates: { canonical: `/v/${p.brand}/${p.model}` },
    robots: found.verified.length >= 8 ? undefined : { index: false, follow: true },
  }
}

export default function ModelPage({ params }: PageProps<"/v/[brand]/[model]">) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

async function Content({ params }: { params: PageProps<"/v/[brand]/[model]">["params"] }) {
  const p = await params
  const found = await load(p.brand, p.model)
  if (!found) notFound()
  const { data, option, verified, rest } = found
  const groups = [
    { slug: "fits", name: `Fits ${option.label}`, tiles: verified },
    { slug: "sold-for", name: verified.length ? `Also sold for ${option.label}` : `Sold for ${option.label}`, tiles: rest },
  ].filter((g) => g.tiles.length > 0)
  return (
    <>
      <PageHead back={{ href: "/v", label: "Vehicles" }} title={`Parts for ${option.label}`}>
        {rest.length ? <p className="max-w-[60ch] text-sm text-muted">Parts marked sold for this scooter are not yet checked on one. Not sure? Send us a photo on WhatsApp.</p> : null}
        <RememberVehicle vehicleKey={option.key} label={option.label} />
      </PageHead>
      {groups.length ? <Listing groups={groups} models={data.models} chips="spy" showVehicleFacet={false} /> : <p className="py-8 text-muted">No parts listed for this scooter yet. Ask us on WhatsApp.</p>}
    </>
  )
}
