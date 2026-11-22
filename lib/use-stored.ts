"use client"

import { useSyncExternalStore } from "react"

const EVENT = "ws-stored"

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function subscribe(fn: () => void) {
  window.addEventListener("storage", fn)
  window.addEventListener(EVENT, fn)
  return () => {
    window.removeEventListener("storage", fn)
    window.removeEventListener(EVENT, fn)
  }
}

export function useStored(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  )
}

export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    return
  } finally {
    window.dispatchEvent(new Event(EVENT))
  }
}
