"use client"

import { useSyncExternalStore } from "react"
import { storeStatus, type Hours, type SpecialDay } from "@/lib/time"

function subscribe(fn: () => void) {
  const timer = setInterval(fn, 60000)
  return () => {
    clearInterval(timer)
  }
}

const minute = () => Math.floor(Date.now() / 60000)

export default function OpenStatus({ weekly, special }: { weekly: Hours[]; special: SpecialDay[] }) {
  const now = useSyncExternalStore(subscribe, minute, () => null)
  if (now === null) return <span className="inline-block h-[1lh]" />
  const status = storeStatus(new Date(now * 60000), weekly, special)
  return <span className={`font-medium ${status.tone === "open" ? "text-ink" : status.tone === "closing" ? "text-signal" : "text-muted"}`}>{status.text}</span>
}
