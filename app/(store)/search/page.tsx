import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import PageHead from "@/components/PageHead"
import ProductRow from "@/components/ProductRow"
import { ListingSkeleton } from "@/components/Skeletons"
import SystemIcon from "@/components/SystemIcon"
import WhatsAppLink from "@/components/WhatsAppLink"
import { searchProducts } from "@/lib/search"
import { catalog } from "@/lib/storefront"
import { button } from "@/lib/ui"
import { photoHelp } from "@/lib/whatsapp"

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } }

const PAGE = 24

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-[800px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80)
  const shown = Math.min(240, Math.max(PAGE, Number(typeof sp.n === "string" ? sp.n : PAGE) || PAGE))
  const data = await catalog()
  const all = searchProducts(data.tiles, q)
  return (
    <>
      <PageHead back={{ href: "/", label: "Home" }} title={q ? `Results for ${q}` : "Search parts"}>
        <form action="/search" role="search" className="mt-2">
          <label htmlFor="search-q" className="sr-only">
            Search parts by code, name or vehicle
          </label>
          <input id="search-q" name="q" type="search" defaultValue={q} enterKeyHint="search" placeholder="Part code, name or vehicle" className="h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-base" />
        </form>
        {q ? (
          <p className="text-sm text-muted" aria-live="polite">
            {all.length} {all.length === 1 ? "part" : "parts"}
          </p>
        ) : null}
      </PageHead>
      {q && all.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-6">
          <p>No part matches &lsquo;{q}&rsquo;. Check the code, or send a photo on WhatsApp.</p>
          <WhatsAppLink text={photoHelp(null)} variant="secondary">
            Send a photo on WhatsApp
          </WhatsAppLink>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.systems.map((s) => {
              return (
                <li key={s.slug}>
                  <Link href={`/c/${s.slug}`} className={`${button.small} h-11 no-underline`}>
                    <SystemIcon slug={s.slug} className="size-4 text-muted" strokeWidth={1.5} />
                    {s.shortName}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {all.slice(0, shown).map((t) => (
          <li key={t.id}>
            <ProductRow tile={t} />
          </li>
        ))}
      </ul>
      {all.length > shown ? (
        <Link href={`/search?q=${encodeURIComponent(q)}&n=${String(shown + PAGE)}`} scroll={false} className={`${button.secondary} mt-4 w-full no-underline`}>
          Show more
        </Link>
      ) : null}
    </>
  )
}
