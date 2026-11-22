"use client"

import { ImageOff, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { formatPaise } from "@/lib/format"
import { chip, field } from "@/lib/ui"
import type { ProductRow } from "./load"

type Filter = "all" | "buyable" | "blocked" | "out" | "draft"

const FILTERS: [Filter, string, (r: ProductRow) => boolean][] = [
  ["all", "All", () => true],
  ["buyable", "Buyable", (r) => r.issues.length === 0],
  ["blocked", "Not buyable yet", (r) => r.status === "active" && r.issues.length > 0],
  ["out", "Out of stock", (r) => r.stock === 0],
  ["draft", "Draft or archived", (r) => r.status !== "active"],
]

export function Thumb({ publicId, own }: { publicId: string | null; own: boolean }) {
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-control bg-well">
      {publicId ? (
        <Image src={publicId} alt="" fill sizes="56px" className={`object-contain ${own ? "" : "opacity-60 grayscale"}`} />
      ) : (
        <ImageOff aria-hidden size={18} className="absolute inset-0 m-auto text-on-well-muted" />
      )}
    </div>
  )
}

export function ProductList({ rows }: { rows: ProductRow[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [system, setSystem] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const systems = useMemo(() => [...new Set(rows.map((r) => r.system))], [rows])
  const test = FILTERS.find(([f]) => f === filter)?.[2] ?? (() => true)
  const q = query.trim().toLowerCase()
  const shown = rows.filter((r) => test(r) && (!system || r.system === system) && (!q || `${r.name} ${r.partCode ?? ""} ${r.sku} ${r.category}`.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-4">
      <label className="relative">
        <span className="sr-only">Search products</span>
        <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input className={`${field} pl-10`} type="search" placeholder="Name, code, SKU or category" value={query} onChange={(e) => { setQuery(e.target.value) }} />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Status">
        {FILTERS.map(([value, label, fn]) => (
          <button key={value} type="button" aria-pressed={filter === value} className={chip(filter === value)} onClick={() => { setFilter(value) }}>
            {label} <span className="ml-1 opacity-70">{rows.filter(fn).length}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="System">
        <button type="button" aria-pressed={system === null} className={chip(system === null)} onClick={() => { setSystem(null) }}>
          Every system
        </button>
        {systems.map((s) => (
          <button key={s} type="button" aria-pressed={system === s} className={chip(system === s)} onClick={() => { setSystem(s) }}>
            {s}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{shown.length} products</p>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted">No products match. Clear the search or pick another filter.</p>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {shown.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/products/${String(r.id)}`}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-line py-3 no-underline transition-colors duration-200 ease-out md:grid-cols-[auto_minmax(0,1fr)_180px_160px] [@media(hover:hover)]:hover:bg-surface"
              >
                <Thumb publicId={r.photo} own={r.ownPhoto} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="truncate text-sm text-muted">
                    {r.sku}, {r.category}
                    {r.status !== "active" ? `, ${r.status}` : ""}
                  </p>
                </div>
                <p className="col-start-2 text-sm md:col-start-3">
                  {r.retailPaise !== null ? `${formatPaise(r.retailPaise)}, ` : ""}
                  {formatPaise(r.wholesalePaise)}
                  {r.moq > 1 ? ` from ${String(r.moq)}` : ""}
                  <span className="text-muted"> {r.stock === null ? "not counted" : r.stock === 0 ? "out of stock" : `${String(r.stock)} in stock`}</span>
                </p>
                <p className={`col-start-2 text-sm md:col-start-4 ${r.issues.length ? "text-signal" : ""}`}>{r.issues.length === 0 ? "Buyable" : `${String(r.issues.length)} ${r.issues.length === 1 ? "thing" : "things"} to fix`}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
