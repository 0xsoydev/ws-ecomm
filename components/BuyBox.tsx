"use client"

import NumberFlow from "@number-flow/react"
import { Check, Minus, Plus, ShoppingBag, Trash } from "lucide-react"
import { m } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type PointerEvent } from "react"
import { announceAdd, setQty as setCartQty, useCart } from "@/lib/cart"
import { unitWord } from "@/lib/format"
import { hasRetailTier, MAX_LINE_QTY, minQty, nextBreak, perUnit, unitPrice, type Priced } from "@/lib/pricing"
import { button } from "@/lib/ui"
import { validQty } from "./AddButton"
import StickyBar from "./StickyBar"

const rupees = { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 } as const

function Stepper({ value, onChange, min, step, name, removable }: { value: number; onChange: (n: number) => void; min: number; step: number; name: string; removable: boolean }) {
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])
  useEffect(() => () => { clearTimeout(timer.current); }, [])
  const bump = (dir: 1 | -1) => {
    const next = latest.current + dir * step
    if (dir < 0 && latest.current <= min) {
      if (removable) onChange(0)
      return false
    }
    if (next > MAX_LINE_QTY) return false
    latest.current = next
    onChange(next)
    return true
  }
  const press = (e: PointerEvent<HTMLButtonElement>, dir: 1 | -1) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    clearTimeout(timer.current)
    if (!bump(dir)) return
    let interval = 140
    const tick = () => {
      if (dir < 0 && latest.current <= min) return
      if (!bump(dir)) return
      interval = Math.max(45, interval * 0.8)
      timer.current = setTimeout(tick, interval)
    }
    timer.current = setTimeout(tick, 420)
  }
  const stop = () => { clearTimeout(timer.current); }
  const side = "flex size-11 items-center justify-center text-ink transition-colors duration-150 ease-out disabled:text-muted [@media(hover:hover)]:hover:bg-ink/8 active:bg-ink/12"
  return (
    <div role="group" aria-label={`Quantity of ${name}`} className="grid h-12 w-[136px] grid-cols-[44px_1fr_44px] items-center overflow-hidden rounded-control border border-line-strong bg-surface">
      <button
        type="button"
        aria-label={removable && value <= min ? `Remove ${name}` : `One less ${name}`}
        disabled={!removable && value <= min}
        className={side}
        onPointerDown={(e) => {
          press(e, -1)
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onClick={(e) => {
          if (e.detail === 0) bump(-1)
        }}
      >
        {removable && value <= min ? <Trash aria-hidden className="size-4" strokeWidth={1.75} /> : <Minus aria-hidden className="size-4" strokeWidth={2} />}
      </button>
      <input
        aria-label={`Quantity of ${name}`}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        value={draft ?? String(value)}
        onFocus={(e) => {
          setDraft(String(value))
          e.currentTarget.select()
        }}
        onChange={(e) => { setDraft(e.currentTarget.value.replace(/\D/g, "").slice(0, 5)); }}
        onBlur={() => {
          const typed = Number(draft)
          setDraft(null)
          if (Number.isInteger(typed) && typed > 0) onChange(Math.max(min, Math.min(MAX_LINE_QTY, Math.ceil(typed / step) * step)))
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        className="h-full w-full min-w-0 bg-transparent text-center text-lg font-semibold outline-none focus-visible:bg-bg"
      />
      <button
        type="button"
        aria-label={`One more ${name}`}
        className={side}
        onPointerDown={(e) => {
          press(e, 1)
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onClick={(e) => {
          if (e.detail === 0) bump(1)
        }}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}

export default function BuyBox({ id, name, priced, unit }: { id: number; name: string; priced: Priced; unit: string }) {
  const min = minQty(priced)
  const inCart = useCart().find((l) => l.id === id)?.qty ?? 0
  const [picked, setPicked] = useState(min)
  const qty = inCart || picked
  const setQty = (n: number) => {
    if (inCart) setCartQty(id, n)
    else setPicked(Math.max(min, n))
  }
  const { paise, tier } = unitPrice(priced, qty)
  const total = paise * qty
  const brk = nextBreak(priced, qty)
  const tiers = priced.retailPaise !== null && hasRetailTier(priced)
  const chips = priced.moq > 1 ? [priced.moq, priced.moq * 2, priced.moq * 4].filter((n) => n <= MAX_LINE_QTY) : []
  const step = priced.orderStep
  const router = useRouter()
  const add = () => {
    setCartQty(id, validQty(priced, picked))
    announceAdd(id)
    if ("vibrate" in navigator) navigator.vibrate(10)
  }
  const buyNow = () => {
    if (!inCart) setCartQty(id, validQty(priced, picked))
    router.push("/checkout")
  }
  const retailLabel = priced.moq - 1 === 1 ? `1 ${unitWord(unit, 1)}` : `1 to ${String(priced.moq - 1)} ${unitWord(unit, 2)}`

  return (
    <div className="flex flex-col gap-4">
      {tiers ? null : (
        <p className="flex flex-col">
          <span className="text-3xl font-semibold tracking-[-0.01em]">{perUnit(priced.retailPaise ?? priced.wholesalePaise, unit)}</span>
          {min > 1 ? (
            <span className="text-sm text-muted">
              Minimum {min} {unitWord(unit, min)}
            </span>
          ) : null}
        </p>
      )}
      {tiers && priced.retailPaise !== null ? (
        <div role="radiogroup" aria-label="Price per piece" className="grid grid-cols-2 gap-2">
          {[
            { key: "retail", label: retailLabel, paise: priced.retailPaise, start: min, note: null },
            { key: "wholesale", label: `${String(priced.moq)} or more`, paise: priced.wholesalePaise, start: priced.moq, note: "Wholesale" },
          ].map((t) => {
            const on = tier === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { setQty(t.start); }}
                className={`relative flex flex-col items-start gap-0.5 rounded-control border p-3 text-left transition-[transform] duration-150 ease-out active:scale-[0.98] ${on ? "border-ink text-on-accent" : "border-line-strong bg-surface"}`}
              >
                {on ? <m.span layoutId={`tier-${String(id)}`} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-[7px] bg-accent" /> : null}
                <span className={`relative text-sm ${on ? "" : "text-muted"}`}>{t.label}</span>
                <span className="relative text-lg font-semibold">{perUnit(t.paise, unit)}</span>
                <span className="relative flex h-5 items-center gap-1 text-sm">
                  {t.note}
                  {on && t.note ? <Check aria-hidden className="size-4" strokeWidth={2.25} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Stepper value={qty} onChange={setQty} min={min} step={step} name={name} removable={inCart > 0} />
        {chips.length ? (
          <div className="flex gap-1.5" role="group" aria-label="Quick quantities">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set quantity to ${String(c)}`}
                aria-pressed={qty === c}
                onClick={() => { setQty(c); }}
                className="h-11 min-w-11 rounded-control border border-line px-2.5 text-sm font-medium transition-colors duration-150 ease-out aria-pressed:border-ink [@media(hover:hover)]:hover:bg-ink/8"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
        <p className="ml-auto flex flex-col items-end leading-tight">
          <span className="text-xs text-muted">Total</span>
          <NumberFlow value={total / 100} locales="en-IN" format={rupees} className="text-xl font-semibold" />
        </p>
      </div>

      <p className="min-h-6 text-sm" aria-live="polite">
        {brk ? (
          <>
            Add {brk.addQty} more for <span className="font-semibold">{perUnit(brk.paise, unit)}</span>
          </>
        ) : tiers && tier === "wholesale" ? (
          <span className="inline-flex items-center gap-1 font-medium">
            <Check aria-hidden className="size-4" strokeWidth={2.25} />
            Wholesale price applied
          </span>
        ) : step > 1 ? (
          `Sold in packs of ${String(step)}`
        ) : null}
      </p>

      <div id="buy-main" className="grid grid-cols-2 gap-2">
        {inCart ? (
          <Link href="/cart" className={`${button.secondary} h-13 text-lg no-underline`}>
            <ShoppingBag aria-hidden className="size-5" strokeWidth={1.75} />
            View cart
          </Link>
        ) : (
          <button type="button" onClick={add} className={button.big}>
            Add to cart
          </button>
        )}
        <button type="button" onClick={buyNow} className={inCart ? button.big : button.inkBig}>
          {inCart ? "Checkout" : "Buy now"}
        </button>
      </div>

      <StickyBar targetId="buy-main" label={`Buy ${name}`}>
        <div className="flex items-center gap-3">
          {inCart ? (
            <>
              <Stepper value={qty} onChange={setQty} min={min} step={step} name={name} removable />
              <button type="button" onClick={buyNow} className={`${button.big} h-12 flex-1 text-base`}>
                Checkout
              </button>
            </>
          ) : (
            <>
              <p className="flex min-w-0 flex-col leading-tight">
                <NumberFlow value={total / 100} locales="en-IN" format={rupees} className="text-lg font-semibold" />
                <span className="truncate text-xs text-muted">
                  {qty} {unitWord(unit, qty)}
                  {tiers ? `, ${tier}` : ""}
                </span>
              </p>
              <button type="button" onClick={add} className={`${button.big} ml-auto h-12 flex-1`}>
                Add to cart
              </button>
            </>
          )}
        </div>
      </StickyBar>
    </div>
  )
}
