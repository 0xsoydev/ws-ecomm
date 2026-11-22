"use client"

import NumberFlow from "@number-flow/react"
import { ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { clearCart, restoreCart, setQty, useCart, type CartLine } from "@/lib/cart"
import { courierFee } from "@/lib/delivery"
import { formatPaise } from "@/lib/format"
import { hasRetailTier, nextBreak, perUnit, unitPrice } from "@/lib/pricing"
import { useSnapshot } from "@/lib/snapshot"
import type { Catalog, Tile } from "@/lib/storefront"
import { button } from "@/lib/ui"
import { partsList, waLink, type ListLine } from "@/lib/whatsapp"
import AddButton from "./AddButton"
import Placeholder from "./Placeholder"
import ProductCard from "./ProductCard"
import ProductImage from "./ProductImage"

const rupees = { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 } as const

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
      toast("Cart cleared", { action: { label: "Undo", onClick: () => { restoreCart(before) } }, duration: 5000 })
      return
    }
    const gone = before.filter((b) => !lines.some((l) => l.id === b.id))
    const [line] = gone
    if (gone.length !== 1 || !line) return
    toast(`Removed ${label.current(line.id)}`, { action: { label: "Undo", onClick: () => { setQty(line.id, line.qty) } }, duration: 5000 })
  }, [lines])
}

function popular(data: Catalog, exclude: Set<number>, categories: Set<number> | null, count: number) {
  return data.tiles
    .filter((t) => t.purchasable && t.image && !exclude.has(t.id) && (categories === null || categories.has(t.categoryId)))
    .slice(0, count)
}

function Grid({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {tiles.map((t) => (
        <li key={t.id} className="flex">
          <ProductCard tile={t} />
        </li>
      ))}
    </ul>
  )
}

export default function CartView({ scope, minOrderPaise, rates }: { scope: string; minOrderPaise: number; rates: Parameters<typeof courierFee>[0] }) {
  const lines = useCart()
  const { data, failed, retry } = useSnapshot(true)
  const [confirming, setConfirming] = useState(false)
  const byId = new Map(data?.tiles.map((t) => [t.id, t]))
  useRemovalUndo(lines, (id) => byId.get(id)?.name ?? "part")

  if (!data) {
    return failed ? (
      <div className="flex flex-col items-start gap-3 py-10">
        <p>Your cart could not load prices.</p>
        <button type="button" onClick={retry} className={button.secondary}>
          Try again
        </button>
      </div>
    ) : (
      <div aria-hidden className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-container bg-line/50 motion-safe:animate-pulse" />
        ))}
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-10 pt-4">
        <div className="flex flex-col items-start gap-3 rounded-container border border-line bg-surface p-6">
          <ShoppingBag aria-hidden className="size-8 text-muted" strokeWidth={1.25} />
          <h2 className="text-xl">Your cart is empty.</h2>
          <p className="text-muted">Add parts from the catalogue, or search by part code.</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {data.systems.map((s) => (
              <li key={s.slug}>
                <Link href={`/c/${s.slug}`} className={`${button.small} h-10 no-underline`}>
                  {s.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <section aria-labelledby="popular" className="flex flex-col gap-3">
          <h2 id="popular" className="text-xl">
            Popular parts
          </h2>
          <Grid tiles={popular(data, new Set(), null, 8)} />
        </section>
      </div>
    )
  }

  const priced: { line: CartLine; tile: Tile; unit: number; tier: "retail" | "wholesale" }[] = []
  const gone: { line: CartLine; tile: Tile | undefined }[] = []
  for (const line of lines) {
    const tile = byId.get(line.id)
    if (!tile || !tile.purchasable) {
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
  const saved = priced.reduce((sum, p) => (p.tier === "wholesale" && p.tile.priced.retailPaise !== null && hasRetailTier(p.tile.priced) ? sum + (p.tile.priced.retailPaise - p.unit) * p.line.qty : sum), 0)
  const list: ListLine[] = priced.map((p) => ({ code: p.tile.code, name: p.tile.name, qty: p.line.qty, unit: p.tile.unit, unitPaise: p.unit, wholesale: p.tier === "wholesale" && p.tile.priced.retailPaise !== null }))
  const below = total < minOrderPaise
  const fee = courierFee(rates, total)
  const deliveryText = fee === null ? "Free pickup, or confirmed on WhatsApp" : fee === 0 ? "Free" : `${formatPaise(fee)} by courier, or free pickup`
  const more = popular(data, new Set(lines.map((l) => l.id)), new Set(priced.map((p) => p.tile.categoryId)), 4)
  const checkout = below ? (
    <span aria-disabled className={`${button.big} w-full opacity-50`}>
      Proceed to checkout
    </span>
  ) : (
    <Link href="/checkout" className={`${button.big} w-full no-underline`}>
      Proceed to checkout
    </Link>
  )

  return (
    <div className="flex flex-col gap-12 pb-24 lg:pb-0">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <p className="text-sm text-muted">
              {lines.length} {lines.length === 1 ? "item" : "items"}
            </p>
            {confirming ? (
              <div className="flex items-center gap-1 text-sm">
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
                <button
                  type="button"
                  className="h-11 px-2 font-medium"
                  onClick={() => {
                    setConfirming(false)
                  }}
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="h-11 px-2 text-sm font-medium underline underline-offset-2"
                onClick={() => {
                  setConfirming(true)
                }}
              >
                Clear cart
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-3">
            {priced.map(({ line, tile, unit, tier }) => {
              const brk = nextBreak(tile.priced, line.qty)
              return (
                <li key={line.id} className="flex gap-3 rounded-container border border-line bg-surface p-3 sm:gap-4">
                  <Link href={`/p/${tile.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-control border border-line bg-well sm:size-24" aria-hidden tabIndex={-1}>
                    {tile.image ? <ProductImage image={tile.image} alt="" sizes="96px" /> : <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="row" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Link href={`/p/${tile.slug}`} className="line-clamp-2 font-medium no-underline [@media(hover:hover)]:hover:underline">
                      {tile.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {perUnit(unit, tile.unit)}
                      {tile.priced.retailPaise !== null && hasRetailTier(tile.priced) ? `, ${tier}` : ""}
                    </p>
                    {brk ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQty(line.id, tile.priced.moq)
                        }}
                        className="w-fit text-left text-sm font-medium underline underline-offset-2"
                      >
                        Add {brk.addQty} more for {perUnit(brk.paise, tile.unit)}
                      </button>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                      <AddButton id={line.id} priced={tile.priced} name={tile.code ?? tile.name} size="row" />
                      <NumberFlow value={(unit * line.qty) / 100} locales="en-IN" format={rupees} className="font-semibold" />
                    </div>
                  </div>
                </li>
              )
            })}
            {gone.map(({ line, tile }) => (
              <li key={line.id} className="flex items-center gap-3 rounded-container border border-line bg-surface p-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{tile?.name ?? "A part"}</span>
                  <span className="text-sm text-muted">Out of stock now.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQty(line.id, 0)
                  }}
                  className={button.small}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="flex flex-col gap-3 rounded-container border border-line bg-surface p-4 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
          <h2 className="text-lg">Summary</h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Items</dt>
              <dd>{formatPaise(total + saved)}</dd>
            </div>
            {saved > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted">Wholesale price</dt>
                <dd>-{formatPaise(saved)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-right">{deliveryText}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="font-semibold">Total</dt>
              <dd>
                <NumberFlow value={total / 100} locales="en-IN" format={rupees} className="text-xl font-semibold" />
              </dd>
            </div>
          </dl>
          {below ? <p className="text-sm text-danger">The minimum order is {formatPaise(minOrderPaise)}. Add {formatPaise(minOrderPaise - total)} more.</p> : null}
          <div className="hidden lg:block">{checkout}</div>
          <p className="text-xs text-muted">
            {scope}, or pick up in Malad West. We confirm within 1 hour (9 am to 10 pm). Sold by Gulab Auto Garage (WS Green).
          </p>
          <a href={waLink(partsList(list, scope))} target="_blank" rel="noopener" className="text-sm font-medium">
            Or send this list on WhatsApp
          </a>
        </aside>
      </div>

      {more.length ? (
        <section aria-labelledby="more" className="flex flex-col gap-3">
          <h2 id="more" className="text-xl">
            You may also need
          </h2>
          <Grid tiles={more} />
        </section>
      ) : null}

      <div data-bar="send" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3">
          <p className="flex flex-col leading-tight">
            <NumberFlow value={total / 100} locales="en-IN" format={rupees} className="text-lg font-semibold" />
            <span className="text-xs text-muted">
              {priced.length} {priced.length === 1 ? "item" : "items"}
            </span>
          </p>
          <div className="ml-auto flex-1">{checkout}</div>
        </div>
      </div>
    </div>
  )
}
