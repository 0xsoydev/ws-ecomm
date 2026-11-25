"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import type { BrandTile } from "@/lib/brands"
import { partsCount } from "@/lib/format"
import { button } from "@/lib/ui"

export default function BrandRail({ brands, title = "Shop by scooter", id = "brands" }: { brands: BrandTile[]; title?: string; id?: string }) {
  const rail = useRef<HTMLUListElement>(null)
  if (brands.length === 0) return null
  const nudge = (dir: 1 | -1) => {
    const el = rail.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
        <h2 id={id} className="text-lg">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <Link href="/v" className="flex min-h-11 items-center px-2 text-sm font-medium no-underline [@media(hover:hover)]:hover:underline">
            All vehicles
          </Link>
          <span className="hidden gap-1 [@media(hover:hover)]:flex">
            <button type="button" aria-label="Scroll brands left" onClick={() => { nudge(-1) }} className={`${button.icon} border border-line`}>
              <ChevronLeft aria-hidden className="size-4.5" strokeWidth={2} />
            </button>
            <button type="button" aria-label="Scroll brands right" onClick={() => { nudge(1) }} className={`${button.icon} border border-line`}>
              <ChevronRight aria-hidden className="size-4.5" strokeWidth={2} />
            </button>
          </span>
        </div>
      </div>
      <ul ref={rail} className="flex snap-x snap-proximity scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] sm:scroll-px-0 sm:px-0 sm:[mask-image:none]">
        {brands.map((b) => (
          <li key={b.slug} className="shrink-0 snap-start">
            <Link
              href={`/v/${b.slug}`}
              aria-label={`${b.name}, ${b.count ? partsCount(b.count) : "ask us for parts"}`}
              className="group flex h-24 w-36 flex-col items-center justify-center gap-2 rounded-container border border-line bg-surface px-4 no-underline transition-[border-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:border-line-strong"
            >
              <span
                aria-hidden
                className="block h-8 w-full bg-muted transition-colors duration-150 ease-out [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] group-hover:bg-ink group-focus-visible:bg-ink"
                style={{ maskImage: `url(/brands/${b.slug}.svg)`, WebkitMaskImage: `url(/brands/${b.slug}.svg)` }}
              />
              <span aria-hidden className="text-xs text-muted">
                {b.count ? partsCount(b.count) : "Ask us"}
              </span>
            </Link>
          </li>
        ))}
        <li aria-hidden className="w-1 shrink-0 sm:hidden" />
      </ul>
    </section>
  )
}
