"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-control border border-ink bg-accent px-5 font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-60"

export function EnrolPasskey({ email, hasPasskey }: { email: string; hasPasskey: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function finishWithPasskey() {
    await authClient.signOut()
    const { error: failed } = await authClient.signIn.passkey()
    if (failed) {
      setError("The passkey is saved, but sign-in did not finish. Sign in with your passkey from the sign-in page.")
      router.push("/admin/sign-in")
      return
    }
    router.push("/admin")
  }

  async function create() {
    setBusy(true)
    setError("")
    const { error: failed } = await authClient.passkey.addPasskey({ name: navigator.platform || "This device" })
    if (failed) {
      setBusy(false)
      setError("The passkey was not created. Make sure screen lock is on for this device, then try again.")
      return
    }
    await finishWithPasskey()
  }

  async function signIn() {
    setBusy(true)
    setError("")
    await finishWithPasskey()
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {hasPasskey ? (
        <>
          <p className="text-muted">{email} already has a passkey. Admin work needs a passkey sign-in.</p>
          <button type="button" className={primary} disabled={busy} onClick={() => void signIn()}>
            {busy ? "Waiting for your passkey" : "Sign in with passkey"}
          </button>
        </>
      ) : (
        <>
          <p className="text-muted">
            Signed in as {email} for 15 minutes. Create a passkey on this device. From then on you sign in with your fingerprint, face or screen lock, and email codes stop working for this account.
          </p>
          <button type="button" className={primary} disabled={busy} onClick={() => void create()}>
            {busy ? "Creating passkey" : "Create passkey"}
          </button>
        </>
      )}
      <p role="alert" aria-live="polite" className="min-h-6 text-sm text-danger">
        {error}
      </p>
    </div>
  )
}
