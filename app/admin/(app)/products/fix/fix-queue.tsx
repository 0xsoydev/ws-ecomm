"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { ISSUES, type Issue } from "@/lib/catalog"
import { button, chip, field } from "@/lib/ui"
import type { ProductRow } from "../load"
import { Thumb } from "../product-list"
import { setLegalFields } from "./actions"

const BULK: Partial<Record<Issue, "legal" | "packaging">> = { origin: "legal", importer: "legal", maker: "legal", prePackaged: "packaging" }

export function FixQueue({ rows, initialIssue }: { rows: ProductRow[]; initialIssue: Issue | null }) {
  const counts = new Map<Issue, number>()
  for (const r of rows) for (const i of r.issues) counts.set(i, (counts.get(i) ?? 0) + 1)
  const available = (Object.keys(ISSUES) as Issue[]).filter((i) => counts.has(i)).sort((a, b) => Number(Boolean(BULK[b])) - Number(Boolean(BULK[a])) || Number(a === "price") - Number(b === "price"))
  const [issue, setIssue] = useState<Issue | null>(initialIssue && counts.has(initialIssue) ? initialIssue : (available[0] ?? null))
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [form, setForm] = useState({ countryOfOrigin: "", maker: "", makerAddress: "", prePackaged: "" as "" | "loose" | "packed" })
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (!issue) return <p className="py-12 text-center text-muted">Nothing to fix. Every active product is buyable online.</p>

  const shown = rows.filter((r) => r.issues.includes(issue))
  const mode = BULK[issue]
  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function apply() {
    setMessage(null)
    const payload = {
      ids: [...selected],
      ...(mode === "legal" ? { countryOfOrigin: form.countryOfOrigin, maker: form.maker, makerAddress: form.makerAddress } : {}),
      ...(mode === "packaging" && form.prePackaged ? { prePackaged: form.prePackaged === "packed" } : {}),
    }
    startTransition(async () => {
      try {
        const n = await setLegalFields(payload)
        setSelected(new Set())
        setMessage({ tone: "ok", text: `Updated ${String(n)} ${n === 1 ? "product" : "products"}` })
      } catch {
        setMessage({ tone: "error", text: "Not saved. Fill at least one field and try again." })
      }
    })
  }

  const ready = selected.size > 0 && (mode === "legal" ? Boolean(form.countryOfOrigin.trim() || form.maker.trim() || form.makerAddress.trim()) : Boolean(form.prePackaged))

  return (
    <div className="flex flex-col gap-4 pb-48 md:pb-40">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Missing">
        {available.map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={issue === i}
            className={chip(issue === i)}
            onClick={() => {
              setIssue(i)
              setSelected(new Set())
              setMessage(null)
            }}
          >
            {ISSUES[i]} <span className="ml-1 opacity-70">{counts.get(i)}</span>
          </button>
        ))}
      </div>

      {issue === "price" ? (
        <p>
          Prices are approved on the <Link href="/admin/products/pricing">Prices screen</Link>.
        </p>
      ) : !mode ? (
        <p className="text-muted">This one is different for each product. Open each product to fill it in.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={button.small} onClick={() => { setSelected(new Set(shown.map((r) => r.id))) }}>
            Select all {shown.length}
          </button>
          {selected.size > 0 && (
            <button type="button" className={button.small} onClick={() => { setSelected(new Set()) }}>
              Clear selection
            </button>
          )}
        </div>
      )}

      <ul className="flex flex-col border-t border-line">
        {shown.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 border-b border-line py-2 transition-colors duration-200 ease-out ${selected.has(r.id) ? "bg-surface" : ""}`}>
            {mode && (
              <input type="checkbox" aria-label={`Select ${r.name}`} className="size-5 shrink-0 accent-[var(--ink)]" checked={selected.has(r.id)} onChange={() => { toggle(r.id) }} />
            )}
            <Thumb publicId={r.photo} own={r.ownPhoto} />
            <div className="min-w-0 flex-1">
              <Link href={`/admin/products/${String(r.id)}`} className="block truncate font-semibold">
                {r.name}
              </Link>
              <p className="truncate text-sm text-muted">
                {r.category}
                {r.countryOfOrigin ? `, ${r.countryOfOrigin}` : ""}
                {r.maker ? `, ${r.maker}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {mode && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface px-4 py-3 md:bottom-0 md:left-56 md:px-8">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-3">
            {mode === "legal" ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr]">
                <input aria-label="Country of origin" placeholder="Country of origin, e.g. China" className={field} value={form.countryOfOrigin} onChange={(e) => { setForm((f) => ({ ...f, countryOfOrigin: e.target.value })) }} />
                <input aria-label="Importer or maker name" placeholder="Importer or maker name" className={field} value={form.maker} onChange={(e) => { setForm((f) => ({ ...f, maker: e.target.value })) }} />
                <input aria-label="Importer or maker address" placeholder="Importer or maker address" className={field} value={form.makerAddress} onChange={(e) => { setForm((f) => ({ ...f, makerAddress: e.target.value })) }} />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Packaging">
                {(
                  [
                    ["loose", "Loose"],
                    ["packed", "Pre-packaged"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border px-3 ${form.prePackaged === v ? "border-ink font-semibold" : "border-line-strong"}`}>
                    <input type="radio" name="bulk-packaging" className="accent-[var(--ink)]" checked={form.prePackaged === v} onChange={() => { setForm((f) => ({ ...f, prePackaged: v })) }} />
                    {l}
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <p aria-live="polite" className={`min-w-0 flex-1 text-sm ${message?.tone === "error" ? "text-danger" : "text-muted"}`}>
                {message?.text ?? `${String(selected.size)} selected. Empty fields are left as they are.`}
              </p>
              <button type="button" className={button.primary} disabled={!ready || pending} onClick={apply}>
                {pending ? "Saving" : `Apply to ${String(selected.size)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
