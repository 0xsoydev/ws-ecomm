"use client"

import { Check, ImageOff, Search } from "lucide-react"
import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams, useSelectedLayoutSegment } from "next/navigation"
import { useEffect, useMemo, useState, useTransition, type KeyboardEvent } from "react"
import { formatPaise, parseRupees } from "@/lib/format"
import { hasRetailTier } from "@/lib/pricing"
import { button, chip, field } from "@/lib/ui"
import { approvePrices, setLegalFields } from "./actions"
import type { ProductRow } from "./load"
import { isView, todo, todoText, VIEWS, type View } from "./views"
import { mayLeave, setOrder } from "./workspace"

export function Thumb({ publicId, own, size = "size-14" }: { publicId: string | null; own: boolean; size?: string }) {
  return (
    <div className={`relative ${size} shrink-0 overflow-hidden rounded-control bg-well`}>
      {publicId ? (
        <Image src={publicId} alt="" fill sizes="56px" className={`object-contain ${own ? "" : "opacity-70"}`} />
      ) : (
        <ImageOff aria-hidden size={18} className="absolute inset-0 m-auto text-on-well-muted" />
      )}
    </div>
  )
}

const toDraft = (paise: number | null) => (paise === null ? "" : paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100))

function checkRetail(row: ProductRow, draft: string): { retailPaise: number | null; error: string | null } {
  if (!hasRetailTier(row) || !draft.trim()) return { retailPaise: null, error: null }
  const paise = parseRupees(draft)
  if (paise === null || paise <= 0) return { retailPaise: null, error: "Enter a price like 120 or 120.50" }
  if (paise < row.wholesalePaise) return { retailPaise: null, error: `Below wholesale ${formatPaise(row.wholesalePaise)}` }
  if (row.mrpPaise !== null && paise > row.mrpPaise) return { retailPaise: null, error: `Above MRP ${formatPaise(row.mrpPaise)}` }
  return { retailPaise: paise, error: null }
}

function nextPriceInput(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return
  event.preventDefault()
  const inputs = [...document.querySelectorAll<HTMLInputElement>("input[data-price]")]
  inputs[inputs.indexOf(event.currentTarget) + 1]?.focus()
}

export function ProductList({ rows, isOwner }: { rows: ProductRow[]; isOwner: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const open = Number(useSelectedLayoutSegment()) || null
  const view: View = isView(params.get("view")) ? (params.get("view") as View) : "all"
  const query = params.get("q") ?? ""
  const issue = params.get("issue")
  const [typed, setTyped] = useState(query)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [drafts, setDrafts] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, toDraft(r.priceApproved ? r.retailPaise : (r.proposedRetailPaise ?? r.retailPaise))])))
  const [legal, setLegal] = useState({ maker: "", makerAddress: "", prePackaged: "" as "" | "loose" | "packed" })
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, start] = useTransition()

  const go = (next: { view?: View; q?: string }) => {
    const p = new URLSearchParams(params)
    if (next.view) p.delete("issue")
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") p.set(k, v)
      else p.delete(k)
    }
    setSelected(new Set())
    setMessage(null)
    router.replace(`${pathname}${p.size ? `?${p.toString()}` : ""}` as Route, { scroll: false })
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (typed.trim() !== query) go({ q: typed.trim() })
    }, 250)
    return () => {
      clearTimeout(t)
    }
  })

  const q = query.toLowerCase()
  const shown = useMemo(() => rows.filter((r) => VIEWS[view].test(r) && (!issue || r.issues.some((i) => i === issue)) && (!q || `${r.name} ${r.partCode ?? ""} ${r.sku} ${r.category}`.toLowerCase().includes(q))), [rows, view, q, issue])
  useEffect(() => {
    setOrder(shown.map((r) => ({ id: r.id, todo: todo(r) })))
  }, [shown])

  const search = params.toString()
  const href = (id: number) => `/admin/products/${String(id)}${search ? `?${search}` : ""}` as Route
  const toggle = (id: number, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }
  const chosen = shown.filter((r) => selected.has(r.id))
  const badPrice = chosen.filter((r) => checkRetail(r, drafts[r.id] ?? "").error)

  const approve = () => {
    setMessage(null)
    start(async () => {
      try {
        const result = await approvePrices(chosen.map((r) => ({ id: r.id, retailPaise: checkRetail(r, drafts[r.id] ?? "").retailPaise })))
        setSelected(new Set(result.errors.map((e) => e.id)))
        const failed = result.errors.map((e) => `${rows.find((r) => r.id === e.id)?.name ?? String(e.id)}: ${e.message}`)
        setMessage(failed.length ? { tone: "error", text: `Approved ${String(result.approved)}. Not approved: ${failed.join("; ")}` } : { tone: "ok", text: `Approved ${String(result.approved)} ${result.approved === 1 ? "price" : "prices"}` })
      } catch {
        setMessage({ tone: "error", text: "Not saved. Check your connection and try again." })
      }
    })
  }

  const applyLegal = () => {
    setMessage(null)
    start(async () => {
      try {
        const n = await setLegalFields({ ids: chosen.map((r) => r.id), ...(legal.maker.trim() ? { maker: legal.maker } : {}), ...(legal.makerAddress.trim() ? { makerAddress: legal.makerAddress } : {}), ...(legal.prePackaged ? { prePackaged: legal.prePackaged === "packed" } : {}) })
        setSelected(new Set())
        setMessage({ tone: "ok", text: `Updated ${String(n)} ${n === 1 ? "product" : "products"}` })
      } catch {
        setMessage({ tone: "error", text: "Not saved. Fill at least one field and try again." })
      }
    })
  }

  const bulk = view === "prices" ? isOwner : view === "fix"
  const Heading = open ? "h2" : "h1"

  return (
    <div className={`flex min-w-0 flex-col gap-3 ${open ? "hidden xl:flex" : "flex"} xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)]`}>
      <div className="flex items-baseline justify-between gap-3">
        <Heading className="text-2xl">Products</Heading>
        <p className="text-sm text-muted" aria-live="polite">
          {shown.length} of {rows.length}
        </p>
      </div>
      <label className="relative">
        <span className="sr-only">Search products</span>
        <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input className={`${field} pl-10`} type="search" placeholder="Name, code, SKU or category" value={typed} onChange={(e) => { setTyped(e.target.value) }} />
      </label>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] xl:mx-0 xl:flex-wrap xl:px-0" role="group" aria-label="View">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} className={`${chip(view === v)} h-9`} onClick={() => { go({ view: v }) }}>
            {VIEWS[v].label} <span className="ml-1.5 opacity-70">{rows.filter(VIEWS[v].test).length}</span>
          </button>
        ))}
      </div>
      {view === "prices" ? <p className="text-sm text-muted">{isOwner ? "Type the retail price for 1 piece, Enter for the next row, then approve the ticked rows." : "Only the owner can approve prices."}</p> : null}
      {view === "fix" ? <p className="text-sm text-muted">Tick products to fill the same maker or packaging for all of them.</p> : null}

      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted">{query ? "No products match. Clear the search or pick another view." : "Nothing here. Every product in this view is done."}</p>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-col overflow-y-auto overscroll-contain border-t border-line px-1 xl:flex-1">
          {shown.map((r) => {
            const draft = drafts[r.id] ?? ""
            const price = checkRetail(r, draft)
            const current = r.id === open
            return (
              <li key={r.id} className={`flex items-start gap-3 border-b border-line py-2.5 ${current ? "bg-surface" : ""}`}>
                {bulk ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    className="mt-4 ml-1 size-5 shrink-0 accent-(--ink)"
                    checked={selected.has(r.id)}
                    disabled={view === "prices" && Boolean(price.error)}
                    onChange={(e) => { toggle(r.id, e.target.checked) }}
                  />
                ) : null}
                <Link
                  href={href(r.id)}
                  aria-current={current ? "page" : undefined}
                  onClick={(e) => {
                    if (!mayLeave()) e.preventDefault()
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-control no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-surface"
                >
                  <Thumb publicId={r.photo} own={r.ownPhoto} size="size-12" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{r.name}</span>
                    <span className="truncate text-sm text-muted">
                      {formatPaise(r.retailPaise ?? r.wholesalePaise)}
                      {r.moq > 1 ? ` (${formatPaise(r.wholesalePaise)} from ${String(r.moq)})` : ""}, {r.stock === null ? "not counted" : r.stock === 0 ? "out of stock" : `${String(r.stock)} in stock`}
                    </span>
                    {todo(r) ? (
                      <span className="truncate text-sm text-signal">{todoText(r)}</span>
                    ) : r.status === "active" ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Check aria-hidden size={14} /> Buyable
                      </span>
                    ) : (
                      <span className="text-sm text-muted">{r.status === "draft" ? "Draft" : "Archived"}</span>
                    )}
                  </span>
                </Link>
                {view === "prices" && hasRetailTier(r) ? (
                  <label className="flex w-28 shrink-0 flex-col gap-1">
                    <span className="sr-only">Retail price of {r.name}</span>
                    <span className="relative">
                      <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted">
                        ₹
                      </span>
                      <input
                        data-price
                        className={`${field} pl-6`}
                        inputMode="decimal"
                        enterKeyHint="next"
                        disabled={!isOwner}
                        aria-invalid={Boolean(price.error)}
                        aria-describedby={price.error ? `retail-${String(r.id)}` : undefined}
                        value={draft}
                        onKeyDown={nextPriceInput}
                        onChange={(e) => {
                          setDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                          toggle(r.id, !checkRetail(r, e.target.value).error)
                        }}
                      />
                    </span>
                    {price.error ? (
                      <span id={`retail-${String(r.id)}`} className="text-xs text-danger">
                        {price.error}
                      </span>
                    ) : null}
                  </label>
                ) : view === "prices" ? (
                  <span className="w-28 shrink-0 pt-3 text-xs text-muted">One price</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {bulk && (selected.size > 0 || message) ? (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2 rounded-container border border-line-strong bg-surface p-3 md:bottom-0">
          {view === "fix" && selected.size > 0 ? (
            <div className="grid gap-2">
              <input aria-label="Maker name" placeholder="Maker name" className={field} value={legal.maker} onChange={(e) => { setLegal((l) => ({ ...l, maker: e.target.value })) }} />
              <input aria-label="Maker address" placeholder="Maker address" className={field} value={legal.makerAddress} onChange={(e) => { setLegal((l) => ({ ...l, makerAddress: e.target.value })) }} />
              <select aria-label="Packaging" className={field} value={legal.prePackaged} onChange={(e) => { setLegal((l) => ({ ...l, prePackaged: e.target.value as typeof l.prePackaged })) }}>
                <option value="">Packaging unchanged</option>
                <option value="loose">Loose</option>
                <option value="packed">Pre-packaged</option>
              </select>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <p aria-live="polite" className={`min-w-0 flex-1 text-sm ${message?.tone === "error" ? "text-danger" : "text-muted"}`}>
              {message?.text ?? (badPrice.length ? `${String(badPrice.length)} price needs fixing` : `${String(selected.size)} selected`)}
            </p>
            {selected.size > 0 ? (
              view === "prices" ? (
                <button type="button" className={button.primary} disabled={pending || badPrice.length > 0} onClick={approve}>
                  {pending ? "Approving" : `Approve ${String(selected.size)}`}
                </button>
              ) : (
                <button type="button" className={button.primary} disabled={pending || !(legal.maker.trim() || legal.makerAddress.trim() || legal.prePackaged)} onClick={applyLegal}>
                  {pending ? "Saving" : `Apply to ${String(selected.size)}`}
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
