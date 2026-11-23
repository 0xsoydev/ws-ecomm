import { ChevronRight } from "lucide-react"
import type { Metadata, Route } from "next"
import Link from "next/link"
import { Suspense } from "react"
import PageHead from "@/components/PageHead"
import Listing from "@/components/Listing"
import { ListingSkeleton } from "@/components/Skeletons"
import SystemIcon from "@/components/SystemIcon"
import WhatsAppLink from "@/components/WhatsAppLink"
import { EXACT, searchScored, shortcuts } from "@/lib/search"
import { catalog } from "@/lib/storefront"
import { button } from "@/lib/ui"
import { photoHelp } from "@/lib/whatsapp"

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = (await searchParams).q
  return { title: typeof q === "string" && q.trim() ? `${q.trim().slice(0, 60)}: search` : "Search", robots: { index: false, follow: true } }
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80)
  const data = await catalog()
  const scored = searchScored(data.tiles, q)
  const all = scored.map((r) => r.item)
  const exact = scored.filter((r) => r.s >= EXACT).map((r) => r.item)
  const groups = exact.length && exact.length < all.length ? [{ slug: "exact", name: "Exact match", tiles: exact }, { slug: "similar", name: "Similar parts", tiles: all.filter((t) => !exact.includes(t)) }] : [{ slug: "results", name: `Parts matching ${q}`, tiles: all }]
  const jumps = q ? shortcuts(data, q) : []
  return (
    <>
      <PageHead back={{ href: "/", label: "Home" }} title={q ? `Results for ${q}` : "Search parts"} />
      {jumps.length ? (
        <ul aria-label="Matching vehicles and categories" className="mt-1 flex flex-wrap gap-2">
          {jumps.map((j) => (
            <li key={j.href}>
              <Link href={j.href as Route} className={`${button.small} h-11 no-underline`}>
                {j.label}
                <span className="font-normal text-muted">{j.count}</span>
                <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {q && all.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-6">
          <p>No part matches &lsquo;{q}&rsquo;. Check the code, or send a photo on WhatsApp.</p>
          <WhatsAppLink text={photoHelp(null)} variant="secondary">
            Send a photo on WhatsApp
          </WhatsAppLink>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.systems.map((s) => (
              <li key={s.slug}>
                <Link href={`/c/${s.slug}`} className={`${button.small} h-11 no-underline`}>
                  <SystemIcon slug={s.slug} className="size-4 text-muted" strokeWidth={1.5} />
                  {s.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {all.length ? <Listing groups={groups} models={data.models} chips={[]} /> : null}
    </>
  )
}
