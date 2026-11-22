"use client"

import NumberFlow from "@number-flow/react"
import { ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { clearCart, restoreCart, setQty, useCart, type CartLine } from "@/lib/cart"
import { formatPaise } from "@/lib/format"
import { nextBreak, unitPrice } from "@/lib/pricing"
import { useSnapshot } from "@/lib/snapshot"
import type { Tile } from "@/lib/storefront"
import { button, code as codeClass } from "@/lib/ui"
import { partsList, telLink, waLink, type ListLine } from "@/lib/whatsapp"
import AddButton from "./AddButton"
import Placeholder from "./Placeholder"
import ProductImage from "./ProductImage"
import WhatsAppIcon from "./WhatsAppIcon"

const rupees = { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 } as const

type Priced = { line: CartLine; tile: Tile; unit: number; tier: "retail" | "wholesale" }

function useRemovalUndo(lines: CartLine[], name: (id: number) => string) {
  const previous = useRef<CartLine[] | null>(null)
  const label = useRef(name)
  useEffect(() => {
    label.current = name
  })
  useEffect(() => {
    const before = previous.current
    previous.current = lines
    if (!before) return
    if (lines.length === 0 && before.length > 1) {
      toast("Cart cleared", { action: { label: "Undo", onClick: () => { restoreCart(before); } }, duration: 5000 })
      return
    }
    const gone = before.filter((b) => !lines.some((l) => l.id === b.id))
    const [line] = gone
    if (gone.length !== 1 || !line) return
    toast(`Removed ${label.current(line.id)}`, { action: { label: "Undo", onClick: () => { setQty(line.id, line.qty); } }, duration: 5000 })
  }, [lines])
}

export default function CartView({ scope }: { scope: string }) {
  const lines = useCart()
  const { data, failed, retry } = useSnapshot(lines.length > 0)
  const [confirming, setConfirming] = useState(false)
  const byId = new Map(data?.tiles.map((t) => [t.id, t]))
  useRemovalUndo(lines, (id) => {
    const t = byId.get(id)
    return t ? (t.code ?? t.name) : "part"
  })

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <ShoppingBag aria-hidden className="size-8 text-muted" strokeWidth={1.25} />
        <p className="text-lg">Your cart is empty.</p>
        <form action="/search" role="search" className="w-full max-w-[480px]">
          <label className="sr-only" htmlFor="cart-search">
            Search parts
          </label>
          <input id="cart-search" name="q" type="search" enterKeyHint="search" placeholder="Search parts by code or name" className="h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-base" />
        </form>
        <Link href="/" className="font-medium">
          Browse parts
        </Link>
      </div>
    )
  }

  if (!data) {
    return failed ? (
      <div className="flex flex-col items-start gap-3 py-10">
        <p>Your cart could not load prices.</p>
        <button type="button" onClick={retry} className={button.secondary}>
          Try again
        </button>
      </div>
    ) : (
      <ul aria-hidden className="divide-y divide-line">
        {lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-4">
            <div className="size-14 rounded-control bg-line/70 motion-safe:animate-pulse" />
            <div className="h-4 flex-1 rounded-[4px] bg-line/70 motion-safe:animate-pulse" />
          </li>
        ))}
      </ul>
    )
  }

  const priced: Priced[] = []
  const gone: { line: CartLine; tile: Tile | undefined }[] = []
  for (const line of lines) {
    const tile = byId.get(line.id)
    if (!tile || !tile.purchasable || tile.stock.kind === "out") {
      gone.push({ line, tile })
      continue
    }
    try {
      const p = unitPrice(tile.priced, line.qty)
      priced.push({ line, tile, unit: p.paise, tier: p.tier })
    } catch {
      gone.push({ line, tile })
    }
  }
  const total = priced.reduce((sum, p) => sum + p.unit * p.line.qty, 0)
  const list: ListLine[] = priced.map((p) => ({ code: p.tile.code, name: p.tile.name, qty: p.line.qty, unit: p.tile.unit, unitPaise: p.unit, wholesale: p.tier === "wholesale" && p.tile.priced.retailPaise !== null }))
  const message = partsList(list, scope)

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-12">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <p className="text-sm text-muted">
            {lines.length} {lines.length === 1 ? "item" : "items"}
          </p>
          {confirming ? (
            <div className="flex items-center gap-2 text-sm">
              <span>Clear {lines.length} items?</span>
              <button
                type="button"
                className="h-11 px-2 font-semibold text-danger"
                onClick={() => {
                  clearCart()
                  setConfirming(false)
                }}
              >
                Clear
              </button>
              <button type="button" className="h-11 px-2 font-medium" onClick={() => { setConfirming(false); }}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className="h-11 px-2 text-sm font-medium underline underline-offset-2" onClick={() => { setConfirming(true); }}>
              Clear cart
            </button>
          )}
        </div>
        <ul className="divide-y divide-line">
          {priced.map(({ line, tile, unit, tier }) => {
            const brk = nextBreak(tile.priced, line.qty)
            const label = tile.code ?? tile.name
            return (
              <li key={line.id} className="flex gap-3 py-4">
                <Link href={`/p/${tile.slug}`} className="relative size-14 shrink-0 overflow-hidden rounded-control outline -outline-offset-1 outline-ink/10" aria-hidden tabIndex={-1}>
                  {tile.image ? <ProductImage image={tile.image} alt="" sizes="56px" /> : <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="row" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/p/${tile.slug}`} className="no-underline [@media(hover:hover)]:hover:underline">
                    {tile.code ? <span className={`block ${codeClass}`}>{tile.code}</span> : null}
                    <span className={tile.code ? "line-clamp-2 text-sm text-muted" : "line-clamp-2 font-semibold"}>{tile.name}</span>
                  </Link>
                  <p className="text-sm">
                    {formatPaise(unit)} each{tile.priced.retailPaise !== null ? <span className="text-muted">, {tier}</span> : null}
                  </p>
                  {brk ? (
                    <button type="button" onClick={() => { setQty(line.id, tile.priced.moq); }} className="w-fit text-left text-sm font-medium underline underline-offset-2">
                      Add {brk.addQty} more for {formatPaise(brk.paise)} each
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <AddButton id={line.id} priced={tile.priced} name={label} size="row" />
                  <NumberFlow value={(unit * line.qty) / 100} locales="en-IN" format={rupees} className="font-semibold" />
                </div>
              </li>
            )
          })}
          {gone.map(({ line, tile }) => (
            <li key={line.id} className="flex items-center gap-3 py-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{tile ? (tile.code ?? tile.name) : "A part"}</span>
                <span className="text-sm text-muted">No longer available online.</span>
              </div>
              <button type="button" onClick={() => { setQty(line.id, 0); }} className={button.small}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col gap-3 rounded-container border border-line bg-surface p-4 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
        <p className="flex items-baseline justify-between">
          <span>Items</span>
          <NumberFlow value={total / 100} locales="en-IN" format={rupees} className="text-xl font-semibold" />
        </p>
        <p className="text-sm text-muted">Price inclusive of all charges. {scope}.</p>
        <p className="text-sm text-muted">We confirm within 1 hour (9 am to 10 pm). Pickup is ready soon after.</p>
        <p className="text-sm text-muted">Sold by Gulab Auto Garage (WS Green).</p>
        <div className="mt-1 hidden lg:block">
          <a href={waLink(message)} target="_blank" rel="noopener" className={`${button.inkBig} w-full`}>
            <WhatsAppIcon className="size-5" />
            Send this list on WhatsApp
          </a>
        </div>
        <p className="text-sm text-muted">
          No WhatsApp?{" "}
          <a href={telLink} className="font-medium text-ink">
            Call +91 98217 84847
          </a>
        </p>
      </aside>

      <div data-bar="send" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3">
          <p className="flex flex-col leading-tight">
            <NumberFlow value={total / 100} locales="en-IN" format={rupees} className="text-lg font-semibold" />
            <span className="text-xs text-muted">
              {priced.length} {priced.length === 1 ? "item" : "items"}
            </span>
          </p>
          <a href={waLink(message)} target="_blank" rel="noopener" className={`${button.ink} ml-auto h-12 flex-1`}>
            <WhatsAppIcon className="size-4.5" />
            Send list on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
