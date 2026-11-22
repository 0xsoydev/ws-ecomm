"use client"

import { useEffect, useRef } from "react"

export function useBackToClose(open: boolean, close: () => void) {
  const latest = useRef(close)
  useEffect(() => {
    latest.current = close
  })
  useEffect(() => {
    if (!open) return
    const base: unknown = history.state
    history.pushState({ ...(typeof base === "object" ? base : {}), sheet: true }, "")
    const onPop = () => {
      latest.current()
    }
    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
      if ((history.state as { sheet?: boolean } | null)?.sheet) history.back()
    }
  }, [open])
}
