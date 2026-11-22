"use client"

import { SlidersHorizontal, X } from "lucide-react"
import Link from "next/link"
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { applyFilter, BODY_LABELS, BODY_STYLES, facetCounts, SORT_LABELS, SORTS, type BodyStyle, type ListingFilter, type Sort } from "@/lib/listing"
import type { Tile } from "@/lib/storefront"
import { useStored, writeStored } from "@/lib/use-stored"
import { button, chip } from "@/lib/ui"
import Sheet from "./Sheet"

export type ListingItem = { tile: Tile; node: ReactNode }
export type ListingSection = { slug: string; name: string; items: ListingItem[] }
export type VehicleOption = { key: string; id: number; label: string }
export type ChipLink = { href: string; label: string; active: boolean }

const query = {
  vehicle: parseAsString,
  body: parseAsStringLiteral(BODY_STYLES),
  stock: parseAsBoolean.withDefault(false),
  sort: parseAsStringLiteral(SORTS).withDefault("recommended"),
}

type Props = { sections: ListingSection[]; vehicles: VehicleOption[]; chips: ChipLink[] | "spy"; showVehicleFacet: boolean }

export default function ListingClient(props: Props) {
  const [q, setQ] = useQueryStates(query, { history: "replace", scroll: false })
  const vehicle = props.vehicles.find((v) => v.key === q.vehicle) ?? null
  const filter: ListingFilter = { vehicle: vehicle?.id ?? null, body: q.body, stock: q.stock, sort: q.sort }
  const set = (next: Partial<{ vehicle: string | null; body: BodyStyle | null; stock: boolean; sort: Sort }>) => void setQ(next)
  return <ListingView {...props} filter={filter} vehicle={vehicle} set={set} />
}

export function ListingView({
  sections,
  vehicles,
  chips,
  showVehicleFacet,
  filter,
  vehicle,
  set = () => undefined,
}: Props & {
  filter: ListingFilter
  vehicle: VehicleOption | null
  set?: (next: Partial<{ vehicle: string | null; body: BodyStyle | null; stock: boolean; sort: Sort }>) => void
}) {
  const [sheet, setSheet] = useState(false)
  const all = useMemo(() => sections.flatMap((s) => s.items.map((i) => i.tile)), [sections])
  const counts = facetCounts(all, filter)
  const shown = sections.map((s) => {
    const byId = new Map(s.items.map((i) => [i.tile.id, i]))
    const kept = applyFilter(
      s.items.map((i) => i.tile),
      filter,
    ).flatMap((t) => byId.get(t.id) ?? [])
    return { ...s, kept }
  })
  const active = [
    vehicle ? { label: vehicle.label, clear: () => { set({ vehicle: null }); } } : null,
    filter.body ? { label: BODY_LABELS[filter.body], clear: () => { set({ body: null }); } } : null,
    filter.stock ? { label: "In stock", clear: () => { set({ stock: false }); } } : null,
  ].flatMap((a) => (a ? [a] : []))
  const clearAll = () => { set({ vehicle: null, body: null, stock: false, sort: "recommended" }); }
  const visibleVehicles = vehicles.filter((v) => counts.vehicles.has(v.id) || v.id === filter.vehicle)
  const bodies = BODY_STYLES.filter((b) => counts.bodies.has(b) || b === filter.body)

  const controls = (
    <div className="flex flex-col gap-6">
      {showVehicleFacet && visibleVehicles.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Vehicle</legend>
          <div className="flex flex-wrap gap-2">
            {visibleVehicles.map((v) => (
              <button key={v.key} type="button" aria-pressed={filter.vehicle === v.id} onClick={() => { set({ vehicle: filter.vehicle === v.id ? null : v.key }); }} className={`${chip(filter.vehicle === v.id)} h-9`}>
                {v.label} <span className="ml-1.5 opacity-70">{counts.vehicles.get(v.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {bodies.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Body style</legend>
          <div className="flex flex-wrap gap-2">
            {bodies.map((b) => (
              <button key={b} type="button" aria-pressed={filter.body === b} onClick={() => { set({ body: filter.body === b ? null : b }); }} className={`${chip(filter.body === b)} h-9`}>
                {BODY_LABELS[b]} <span className="ml-1.5 opacity-70">{counts.bodies.get(b) ?? 0}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="font-semibold">
          In stock only <span className="font-normal text-muted">({counts.inStock})</span>
        </span>
        <input type="checkbox" checked={filter.stock} onChange={(e) => { set({ stock: e.currentTarget.checked }); }} className="size-5 accent-(--ink)" />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 font-semibold">Sort</legend>
        {SORTS.map((s) => (
          <label key={s} className="flex min-h-11 items-center gap-3">
            <input type="radio" name="sort" checked={filter.sort === s} onChange={() => { set({ sort: s }); }} className="size-5 accent-(--ink)" />
            {SORT_LABELS[s]}
          </label>
        ))}
      </fieldset>
    </div>
  )

  return (
    <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filters" className="sticky top-[calc(var(--header-h)+24px)] hidden self-start lg:block">
        {controls}
        {active.length ? (
          <button type="button" onClick={clearAll} className="mt-6 text-sm font-medium underline underline-offset-2">
            Clear filters
          </button>
        ) : null}
      </aside>
      <div className="min-w-0">
        <ChipRail chips={chips} sections={shown.filter((s) => s.kept.length > 0)} />
        <div className="flex items-center gap-3 py-3">
          <button type="button" onClick={() => { setSheet(true); }} className={`${button.small} h-11 lg:hidden`}>
            <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} />
            Filter and sort{active.length ? ` (${String(active.length)})` : ""}
          </button>
          <p className="text-sm text-muted" aria-live="polite">
            {counts.total} {counts.total === 1 ? "part" : "parts"}
          </p>
        </div>
        <VehicleOffer vehicles={vehicles} current={vehicle} apply={(key) => { set({ vehicle: key }); }} />
        {active.length ? (
          <ul className="flex flex-wrap gap-2 pb-3">
            {active.map((a) => (
              <li key={a.label}>
                <button type="button" onClick={a.clear} aria-label={`Remove filter ${a.label}`} className={`${chip(true)} h-9 gap-1`}>
                  {a.label}
                  <X aria-hidden className="size-3.5" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {counts.total === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-container border border-line bg-surface p-5">
            <p>No parts match these filters.</p>
            <button type="button" onClick={clearAll} className={button.secondary}>
              Clear filters
            </button>
          </div>
        ) : null}
        {shown.map((s) => (s.kept.length ? <Section key={s.slug} slug={s.slug} name={shown.length > 1 ? s.name : null} items={s.kept} /> : null))}
      </div>
      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="Filter and sort"
        footer={
          <div className="flex items-center gap-3">
            <button type="button" onClick={clearAll} className="h-11 px-2 font-medium underline underline-offset-2">
              Clear
            </button>
            <button type="button" onClick={() => { setSheet(false); }} className={`${button.ink} h-12 flex-1`}>
              Show {counts.total} {counts.total === 1 ? "part" : "parts"}
            </button>
          </div>
        }
      >
        {controls}
      </Sheet>
    </div>
  )
}

function Section({ slug, name, items }: { slug: string; name: string | null; items: ListingItem[] }) {
  return (
    <section id={`s-${slug}`} data-section={slug} aria-label={name ?? undefined} className="scroll-mt-[calc(var(--header-h)+60px)] pt-6 first:pt-2">
      {name ? (
        <h2 className="mb-3 flex items-baseline gap-2 text-lg">
          {name}
          <span className="text-sm font-normal text-muted">{items.length}</span>
        </h2>
      ) : null}
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
        {items.map((i) => (
          <li key={i.tile.id} className="flex">
            {i.node}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ChipRail({ chips, sections }: { chips: ChipLink[] | "spy"; sections: { slug: string; name: string }[] }) {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    if (chips !== "spy") return
    const els = [...document.querySelectorAll<HTMLElement>("[data-section]")]
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setCurrent(top.target.getAttribute("data-section"))
      },
      { rootMargin: "-140px 0px -60% 0px" },
    )
    for (const el of els) io.observe(el)
    return () => { io.disconnect(); }
  }, [chips, sections.length])
  useEffect(() => {
    if (!current) return
    document.getElementById(`chip-${current}`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }, [current])
  const items = chips === "spy" ? sections.map((s) => ({ key: s.slug, label: s.name, href: `#s-${s.slug}`, active: current === s.slug })) : chips.map((c) => ({ key: c.href, label: c.label, href: c.href, active: c.active }))
  if (items.length < 2) return null
  return (
    <nav aria-label="Categories" className="sticky top-(--header-h) z-20 -mx-4 border-b border-line bg-bg px-4 transition-[top] duration-200 ease-out sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <ul className="flex gap-2 overflow-x-auto py-2.5 [scrollbar-width:none]">
        {items.map((c) =>
          chips === "spy" ? (
            <li key={c.key}>
              <a id={`chip-${c.key}`} href={c.href} aria-current={c.active ? "true" : undefined} className={`${chip(c.active)} h-9 whitespace-nowrap no-underline`}>
                {c.label}
              </a>
            </li>
          ) : (
            <li key={c.key}>
              <Link href={c.href as `/c/${string}`} aria-current={c.active ? "page" : undefined} className={`${chip(c.active)} h-9 whitespace-nowrap no-underline`}>
                {c.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}

function VehicleOffer({ vehicles, current, apply }: { vehicles: VehicleOption[]; current: VehicleOption | null; apply: (key: string) => void }) {
  const key = useStored("ws-vehicle")
  const offer = vehicles.find((v) => v.key === key) ?? null
  if (!offer || current) return null
  return (
    <div className="flex items-center gap-1 pb-3">
      <button type="button" onClick={() => { apply(offer.key); }} className={`${chip(false)} h-9`}>
        Filter for {offer.label}?
      </button>
      <button type="button" aria-label="Dismiss" onClick={() => { writeStored("ws-vehicle", null); }} className={button.icon}>
        <X aria-hidden className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
