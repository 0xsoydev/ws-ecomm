"use client"

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import Link from "next/link"
import { useRef, useState, type CSSProperties } from "react"
import type { BrandTile } from "@/lib/brands"
import { partsCount } from "@/lib/format"
import { button } from "@/lib/ui"

function Logo({ brand, hidden }: { brand: BrandTile; hidden?: boolean }) {
  return (
    <li className="shrink-0 snap-start">
      <Link
        href={`/v/${brand.slug}`}
        tabIndex={hidden ? -1 : undefined}
        aria-label={`${brand.name}, ${brand.count ? partsCount(brand.count) : "ask us for parts"}`}
        className="group flex h-16 w-36 items-center justify-center rounded-control no-underline transition-transform duration-150 ease-out active:scale-[0.96]"
      >
        <span
          aria-hidden
          className="block h-10 w-full bg-muted transition-colors duration-150 ease-out [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] group-hover:bg-ink group-focus-visible:bg-ink"
          style={{ maskImage: `url(/brands/${brand.slug}.svg)`, WebkitMaskImage: `url(/brands/${brand.slug}.svg)` }}
        />
      </Link>
    </li>
  )
}

export default function BrandRail({ brands, title = "Shop by scooter", id = "brands", moving = false }: { brands: BrandTile[]; title?: string; id?: string; moving?: boolean }) {
  const rail = useRef<HTMLUListElement>(null)
  const [paused, setPaused] = useState(false)
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
          {moving ? (
            <button type="button" aria-label={paused ? "Play brand logos" : "Pause brand logos"} onClick={() => { setPaused((p) => !p) }} className={`${button.icon} border border-line motion-reduce:hidden`}>
              {paused ? <Play aria-hidden className="size-4" strokeWidth={2} /> : <Pause aria-hidden className="size-4" strokeWidth={2} />}
            </button>
          ) : (
            <span className="hidden gap-1 [@media(hover:hover)]:flex">
              <button type="button" aria-label="Scroll brands left" onClick={() => { nudge(-1) }} className={`${button.icon} border border-line`}>
                <ChevronLeft aria-hidden className="size-4.5" strokeWidth={2} />
              </button>
              <button type="button" aria-label="Scroll brands right" onClick={() => { nudge(1) }} className={`${button.icon} border border-line`}>
                <ChevronRight aria-hidden className="size-4.5" strokeWidth={2} />
              </button>
            </span>
          )}
        </div>
      </div>
      {moving ? (
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)] [scrollbar-width:none] motion-reduce:snap-x motion-reduce:snap-proximity motion-reduce:overflow-x-auto motion-reduce:scroll-px-4 motion-reduce:px-4 sm:motion-reduce:scroll-px-0 motion-reduce:[mask-image:linear-gradient(to_right,#000_88%,transparent)] sm:motion-reduce:px-0 sm:motion-reduce:[mask-image:none]">
          <div
            data-paused={paused || undefined}
            style={{ "--marquee-duration": `${String(brands.length * 3.5)}s` } as CSSProperties}
            className="flex w-max motion-safe:animate-marquee has-[:focus-visible]:animate-none data-paused:[animation-play-state:paused] [@media(hover:hover)]:hover:[animation-play-state:paused]"
          >
            <ul className="flex shrink-0 gap-12 pr-12">
              {brands.map((b) => (
                <Logo key={b.slug} brand={b} />
              ))}
            </ul>
            <ul aria-hidden inert className="flex shrink-0 gap-12 pr-12 motion-reduce:hidden">
              {brands.map((b) => (
                <Logo key={b.slug} brand={b} hidden />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <ul ref={rail} className="flex snap-x snap-proximity scroll-px-4 gap-8 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] sm:scroll-px-0 sm:px-0 sm:[mask-image:none]">
          {brands.map((b) => (
            <Logo key={b.slug} brand={b} />
          ))}
          <li aria-hidden className="w-1 shrink-0 sm:hidden" />
        </ul>
      )}
    </section>
  )
}
