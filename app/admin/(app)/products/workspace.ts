"use client"

import { useSyncExternalStore } from "react"

export type Entry = { id: number; todo: boolean }

let dirty = false
let order: Entry[] = []
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function setDirty(value: boolean) {
  dirty = value
}

export function mayLeave() {
  return !dirty || window.confirm("You have unsaved changes on this product. Leave without saving?")
}

export function setOrder(next: Entry[]) {
  if (next.length === order.length && next.every((e, i) => e.id === order.at(i)?.id && e.todo === order.at(i)?.todo)) return
  order = next
  for (const l of listeners) l()
}

export function useOrder() {
  return useSyncExternalStore(
    subscribe,
    () => order,
    () => order,
  )
}

export function neighbours(list: readonly Entry[], id: number) {
  const i = list.findIndex((e) => e.id === id)
  const after = i < 0 ? list : [...list.slice(i + 1), ...list.slice(0, i)]
  return { prev: i > 0 ? list[i - 1]?.id : undefined, next: i >= 0 ? list[i + 1]?.id : undefined, fix: after.find((e) => e.todo)?.id }
}
