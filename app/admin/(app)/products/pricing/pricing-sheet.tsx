"use client"

import { Check, Search } from "lucide-react"
import { useMemo, useState, useTransition, type KeyboardEvent } from "react"
import { formatPaise, parseRupees } from "@/lib/format"
import { hasRetailTier } from "@/lib/pricing"
import { button, chip, field } from "../../../ui"
import { approvePrices } from "./actions"

type Row = {
  id: number
  sku: string
  name: string
  partCode: string | null
  unit: string
  system: string
  moq: number
  minOrderQty: number
  orderStep: number
  wholesalePaise: number
  retailPaise: number | null
  proposedRetailPaise: number | null
  mrpPaise: number | null
  priceApproved: boolean
}

type Filter = "todo" | "done" | "all"

const toDraft = (paise: number | null) => (paise === null ? "" : paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100))

function check(row: Row, draft: string): { retailPaise: number | null; error: string | null; note: string | null } {
  if (!hasRetailTier(row)) return { retailPaise: null, error: null, note: null }
  if (!draft.trim()) return { retailPaise: null, error: null, note: `Empty: sells at ${formatPaise(row.wholesalePaise)} for any quantity` }
  const paise = parseRupees(draft)
  if (paise === null || paise <= 0) return { retailPaise: null, error: "Enter a price like 120 or 120.50", note: null }
  if (paise < row.wholesalePaise) return { retailPaise: null, error: `Below wholesale ${formatPaise(row.wholesalePaise)}`, note: null }
  if (row.mrpPaise !== null && paise > row.mrpPaise) return { retailPaise: null, error: `Above MRP ${formatPaise(row.mrpPaise)}`, note: null }
  const note = paise > row.wholesalePaise * 2 ? "More than double the wholesale price" : null
  return { retailPaise: paise, error: null, note }
}

function focusNext(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return
  event.preventDefault()
  const inputs = [...document.querySelectorAll<HTMLInputElement>("input[data-price]")]
  inputs[inputs.indexOf(event.currentTarget) + 1]?.focus()
}

export function PricingSheet({ rows, canApprove }: { rows: Row[]; canApprove: boolean }) {
  const [filter, setFilter] = useState<Filter>("todo")
  const [query, setQuery] = useState("")
  const [drafts, setDrafts] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, toDraft(r.priceApproved ? r.retailPaise : r.proposedRetailPaise)])))
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const approvedCount = rows.filter((r) => r.priceApproved).length
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, " ")
    return rows.filter(
      (r) =>
        (filter === "all" || (filter === "todo" ? !r.priceApproved : r.priceApproved)) &&
        (!q || `${r.name} ${r.partCode ?? ""} ${r.sku} ${r.system}`.toLowerCase().includes(q)),
    )
  }, [rows, filter, query])

  const draftOf = (id: number) => drafts[id] ?? ""
  const selectable = shown.filter((r) => !check(r, draftOf(r.id)).error)
  const chosen = rows.filter((r) => selected.has(r.id))
  const invalid = chosen.filter((r) => check(r, draftOf(r.id)).error)

  function toggle(id: number, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function approve() {
    setMessage(null)
    const items = chosen.map((r) => ({ id: r.id, retailPaise: check(r, draftOf(r.id)).retailPaise }))
    startTransition(async () => {
      try {
        const result = await approvePrices(items)
        setSelected((prev) => new Set([...prev].filter((id) => result.errors.some((e) => e.id === id))))
        const failed = result.errors.map((e) => `${rows.find((r) => r.id === e.id)?.name ?? e.id}: ${e.message}`)
        setMessage(
          failed.length
            ? { tone: "error", text: `Approved ${String(result.approved)}. Not approved: ${failed.join("; ")}` }
            : { tone: "ok", text: `Approved ${String(result.approved)} ${result.approved === 1 ? "price" : "prices"}` },
        )
      } catch {
        setMessage({ tone: "error", text: "Saving failed. Check your connection and approve again." })
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-col gap-3">
        <p className="text-muted">
          {approvedCount} of {rows.length} prices approved
        </p>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show">
          {(
            [
              ["todo", `To approve (${String(rows.length - approvedCount)})`],
              ["done", `Approved (${String(approvedCount)})`],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} className={chip(filter === value)} onClick={() => { setFilter(value) }}>
              {label}
            </button>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">Search products</span>
          <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className={`${field} pl-10`} type="search" placeholder="Name, code or SKU" value={query} onChange={(e) => { setQuery(e.target.value) }} />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted">{filter === "todo" && !query ? "Every price is approved." : "No products match. Clear the search or pick another filter."}</p>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {shown.map((r) => {
            const draft = draftOf(r.id)
            const state = check(r, draft)
            const tiered = hasRetailTier(r)
            const isSelected = selected.has(r.id)
            return (
              <li key={r.id} className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 border-b border-line py-3 transition-colors duration-200 ease-out md:grid-cols-[auto_minmax(0,1fr)_220px_200px] md:items-center ${isSelected ? "bg-surface" : ""}`}>
                <input
                  type="checkbox"
                  aria-label={`Select ${r.name}`}
                  className="mt-1 size-5 accent-[var(--ink)] md:mt-0"
                  checked={isSelected}
                  disabled={!canApprove || Boolean(state.error)}
                  onChange={(e) => { toggle(r.id, e.target.checked) }}
                />
                <div className="min-w-0">
                  <p className="font-semibold [font-stretch:105%]">{r.name}</p>
                  <p className="text-sm text-muted">
                    {r.sku}
                    {r.partCode ? `, ${r.partCode}` : ""}, {r.system}
                    {r.priceApproved && (
                      <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-ink">
                        <Check aria-hidden size={14} /> Approved
                      </span>
                    )}
                  </p>
                </div>
                <p className="col-start-2 text-sm md:col-start-3">
                  {tiered ? (
                    <>
                      Wholesale {formatPaise(r.wholesalePaise)} from {r.moq} {r.unit}
                    </>
                  ) : r.minOrderQty > 1 ? (
                    <>
                      Packs of {r.orderStep} {r.unit} at {formatPaise(r.wholesalePaise)} each
                    </>
                  ) : (
                    <>One price {formatPaise(r.wholesalePaise)} for any quantity</>
                  )}
                  {r.mrpPaise !== null && <span className="text-muted">, MRP {formatPaise(r.mrpPaise)}</span>}
                </p>
                <div className="col-start-2 md:col-start-4">
                  {tiered ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-muted">
                        Retail, 1 to {r.moq - 1} {r.unit}
                      </span>
                      <span className="relative">
                        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
                          ₹
                        </span>
                        <input
                          data-price
                          className={`${field} pl-7 ${state.error ? "border-danger" : ""}`}
                          inputMode="decimal"
                          enterKeyHint="next"
                          aria-invalid={Boolean(state.error)}
                          aria-describedby={`price-note-${String(r.id)}`}
                          value={draft}
                          disabled={!canApprove}
                          onKeyDown={focusNext}
                          onChange={(e) => {
                            setDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                            toggle(r.id, !check(r, e.target.value).error)
                          }}
                        />
                      </span>
                      <span id={`price-note-${String(r.id)}`} className={`min-h-5 text-sm ${state.error ? "text-danger" : "text-muted"}`}>
                        {state.error ?? state.note}
                      </span>
                    </label>
                  ) : (
                    <span className="text-sm text-muted">Confirm the single price</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface px-4 py-3 md:bottom-0 md:left-56 md:px-8">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-3">
          {canApprove ? (
            <>
              <p aria-live="polite" className={`min-w-0 basis-full text-sm md:flex-1 md:basis-auto ${message?.tone === "error" ? "text-danger" : "text-muted"}`}>
                {message?.text ?? (invalid.length ? `${String(invalid.length)} selected price needs fixing` : `${String(selected.size)} selected`)}
              </p>
              <button
                type="button"
                className={button.small}
                disabled={pending || selectable.length === 0}
                onClick={() => { setSelected((prev) => new Set([...prev, ...selectable.map((r) => r.id)])) }}
              >
                Select all shown
              </button>
              <button type="button" className={button.primary} disabled={pending || selected.size === 0 || invalid.length > 0} onClick={approve}>
                {pending ? "Approving" : `Approve ${String(selected.size)} ${selected.size === 1 ? "price" : "prices"}`}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">Only the owner can approve prices.</p>
          )}
        </div>
      </div>
    </div>
  )
}
