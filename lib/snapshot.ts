"use client"

import { useEffect, useState } from "react"
import type { Catalog } from "./storefront"

let pending: Promise<Catalog> | null = null

export function loadSnapshot() {
  pending ??= fetch("/api/catalog-snapshot")
    .then((r) => {
      if (!r.ok) throw new Error(`snapshot ${String(r.status)}`)
      return r.json() as Promise<Catalog>
    })
    .catch((e: unknown) => {
      pending = null
      throw e
    })
  return pending
}

export function useSnapshot(enabled: boolean) {
  const [data, setData] = useState<Catalog | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!enabled || data || failed) return
    let live = true
    loadSnapshot().then(
      (d) => {
        if (live) setData(d)
      },
      () => {
        if (live) setFailed(true)
      },
    )
    return () => {
      live = false
    }
  }, [enabled, data, failed])
  return { data, failed, retry: () => { setFailed(false); } }
}
