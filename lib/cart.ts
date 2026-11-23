"use client"

import { useSyncExternalStore } from "react"

export type CartLine = { id: number; qty: number }

const KEY = "ws-cart-v1"
const listeners = new Set<() => void>()
const none: CartLine[] = []
let lines: CartLine[] | null = null

function isLines(v: unknown): v is CartLine[] {
  return (
    Array.isArray(v) &&
    v.length <= 100 &&
    v.every((l: unknown) => typeof l === "object" && l !== null && "id" in l && "qty" in l && Number.isInteger(l.id) && Number.isInteger(l.qty) && Number(l.qty) > 0 && Number(l.qty) <= 10000)
  )
}

function load(): CartLine[] {
  if (lines) return lines
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    lines = isLines(parsed) ? parsed : []
  } catch {
    lines = []
  }
  return lines
}

function save(next: CartLine[]) {
  lines = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    return
  } finally {
    for (const l of listeners) l()
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    lines = null
    fn()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener("storage", onStorage)
  }
}

export function useCart() {
  return useSyncExternalStore(subscribe, load, () => none)
}

export function useQty(id: number) {
  return useSyncExternalStore(
    subscribe,
    () => qtyOf(id),
    () => 0,
  )
}

export function setQty(id: number, qty: number) {
  const current = load()
  if (qty <= 0) {
    save(current.filter((l) => l.id !== id))
    return
  }
  save(current.some((l) => l.id === id) ? current.map((l) => (l.id === id ? { id, qty } : l)) : [...current, { id, qty }])
}

export function clearCart() {
  const previous = load()
  save([])
  return previous
}

export function restoreCart(previous: CartLine[]) {
  save(previous)
}

export function announceAdd(id: number) {
  window.dispatchEvent(new CustomEvent<number>("cart:add", { detail: id }))
}

export function qtyOf(id: number) {
  return load().find((l) => l.id === id)?.qty ?? 0
}
