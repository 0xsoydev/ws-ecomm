"use client"

import { Minus, Plus, Trash } from "lucide-react"
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react"
import { announceAdd, qtyOf, setQty, useQty } from "@/lib/cart"
import { MAX_LINE_QTY, minQty, validQty, type Priced } from "@/lib/pricing"

const HOLD_DELAY = 400
const REPEAT_FIRST = 140
const REPEAT_FASTEST = 45

export default function AddButton({ id, priced, name, size }: { id: number; priced: Priced; name: string; size: "card" | "row" }) {
  const qty = useQty(id)
  const open = qty > 0
  const min = minQty(priced)
  const [draft, setDraft] = useState<string | null>(null)
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined)
  const touch = useRef<number | null>(null)
  const plusRef = useRef<HTMLButtonElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const focusNext = useRef<"plus" | "add" | null>(null)

  useEffect(() => {
    if (focusNext.current === "plus" && open) plusRef.current?.focus()
    if (focusNext.current === "add" && !open) requestAnimationFrame(() => addRef.current?.focus())
    focusNext.current = null
  }, [open])

  useEffect(() => () => { clearTimeout(hold.current); }, [])

  const step = (dir: 1 | -1) => {
    const current = qtyOf(id)
    if (dir < 0 && current <= min) {
      focusNext.current = "add"
      setQty(id, 0)
      return false
    }
    const next = current + dir * priced.orderStep
    if (next > MAX_LINE_QTY) return false
    setQty(id, next)
    return true
  }

  const stopHold = () => {
    clearTimeout(hold.current)
    touch.current = null
  }

  const startHold = (e: PointerEvent<HTMLButtonElement>, dir: 1 | -1) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    stopHold()
    let interval = REPEAT_FIRST
    const tick = () => {
      if (dir < 0 && qtyOf(id) <= min) return
      if (!step(dir)) return
      interval = Math.max(REPEAT_FASTEST, interval * 0.8)
      hold.current = setTimeout(tick, interval)
    }
    if (e.pointerType === "touch") {
      touch.current = dir
      hold.current = setTimeout(() => {
        touch.current = null
        if (dir < 0 && qtyOf(id) <= min) return
        if (step(dir)) hold.current = setTimeout(tick, REPEAT_FIRST)
      }, HOLD_DELAY)
      return
    }
    if (dir < 0 && qtyOf(id) <= min) {
      step(dir)
      return
    }
    if (step(dir)) hold.current = setTimeout(tick, HOLD_DELAY)
  }

  const endPress = () => {
    const dir = touch.current
    stopHold()
    if (dir === 1 || dir === -1) step(dir)
  }

  const keyStep = (e: MouseEvent, dir: 1 | -1) => {
    if (e.detail === 0) step(dir)
  }

  const add = () => {
    focusNext.current = "plus"
    setQty(id, min)
    announceAdd(id)
    if ("vibrate" in navigator) navigator.vibrate(10)
  }

  const commitDraft = () => {
    if (draft === null) return
    const typed = Number(draft)
    setDraft(null)
    if (!Number.isInteger(typed) || typed <= 0) return
    setQty(id, validQty(priced, typed))
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur()
    if (e.key === "Escape") {
      setDraft(null)
      e.currentTarget.blur()
    }
  }

  const sideButton =
    "flex h-full items-center justify-center text-current outline-hidden transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-current/10 active:bg-current/15 focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-current"

  const stepper = (
    <div role="group" aria-label={`Quantity of ${name}`} className={`grid h-full w-full animate-pop ${size === "row" ? "grid-cols-[36px_1fr_36px]" : "grid-cols-[44px_1fr_44px]"}`}>
      <button
        type="button"
        aria-label={qty <= min ? `Remove ${name}` : `One less ${name}`}
        className={`${sideButton} rounded-l-control`}
        onPointerDown={(e) => {
          startHold(e, -1)
        }}
        onPointerUp={endPress}
        onPointerCancel={stopHold}
        onLostPointerCapture={stopHold}
        onClick={(e) => {
          keyStep(e, -1)
        }}
      >
        {qty <= min ? <Trash aria-hidden className="size-4" strokeWidth={1.75} /> : <Minus aria-hidden className="size-4" strokeWidth={2} />}
      </button>
      <input
        aria-label={`Quantity of ${name}`}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        className="w-full min-w-0 bg-transparent text-center font-semibold text-current outline-hidden [appearance:textfield] focus-visible:bg-current/10 focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-current"
        value={draft ?? String(qty)}
        onFocus={(e) => {
          setDraft(String(qty))
          e.currentTarget.select()
        }}
        onChange={(e) => { setDraft(e.currentTarget.value.replace(/\D/g, "").slice(0, 5)); }}
        onBlur={commitDraft}
        onKeyDown={onKey}
      />
      <button
        ref={plusRef}
        type="button"
        aria-label={`One more ${name}`}
        className={`${sideButton} rounded-r-control`}
        onPointerDown={(e) => {
          startHold(e, 1)
        }}
        onPointerUp={endPress}
        onPointerCancel={stopHold}
        onLostPointerCapture={stopHold}
        onClick={(e) => {
          keyStep(e, 1)
        }}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  )

  const addButton = (
    <button
      ref={addRef}
      type="button"
      aria-label={`Add ${name} to cart`}
      className="flex h-full w-full animate-pop items-center justify-center gap-1.5 rounded-control font-semibold outline-hidden transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-current [@media(hover:hover)]:hover:bg-current/10"
      onClick={add}
    >
      {size === "card" ? <span>Add</span> : null}
      <Plus aria-hidden className="size-4" strokeWidth={2} />
    </button>
  )

  return (
    <div
      className={`relative z-10 overflow-hidden rounded-control border transition-[width,background-color,border-color] duration-200 ease-out ${size === "card" ? `h-11 w-full ${open ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink"}` : `h-11 bg-surface text-ink ${open ? "w-28 border-ink" : "w-11 border-line-strong"}`}`}
    >
      {open ? stepper : addButton}
    </div>
  )
}
