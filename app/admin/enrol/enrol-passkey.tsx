"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-control border border-ink bg-accent px-5 font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-60"

export function EnrolPasskey({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function create() {
    setBusy(true)
    setError("")
    const { error: failed } = await authClient.passkey.addPasskey({ name: navigator.platform || "This device" })
    setBusy(false)
    if (failed) {
      setError("The passkey was not created. Make sure screen lock is on for this device, then try again.")
      return
    }
    router.push("/admin")
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">
        A passkey lets you sign in on this device with your fingerprint, face or screen lock instead of typing your password.
        {count > 0 ? ` You have ${String(count)} already; add one for each phone or computer you use.` : ""}
      </p>
      <button type="button" className={primary} disabled={busy} onClick={() => void create()}>
        {busy ? "Creating passkey" : "Create passkey on this device"}
      </button>
      <p role="alert" aria-live="polite" className="min-h-6 text-sm text-danger">
        {error}
      </p>
      <Link href="/admin" className="text-sm">
        Not now
      </Link>
    </div>
  )
}
