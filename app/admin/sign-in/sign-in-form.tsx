"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

type Step = "start" | "email" | "code"

const field = "h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-control border border-ink bg-accent px-5 font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-60"
const secondary = "text-sm underline transition-colors duration-200 ease-out hover:text-muted"

export function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [step, setStep] = useState<Step>("start")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(params.get("error") === "no-access" ? "This account has no admin access. Ask the owner to add you." : "")

  async function signInWithPasskey() {
    setBusy(true)
    setError("")
    const { error: failed } = await authClient.signIn.passkey()
    setBusy(false)
    if (failed) {
      setError("Passkey sign-in did not finish. Try again, or use a code if this is a new device.")
      return
    }
    router.push("/admin")
  }

  async function sendCode() {
    setBusy(true)
    setError("")
    await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
    setBusy(false)
    setStep("code")
  }

  async function verifyCode() {
    setBusy(true)
    setError("")
    const { error: failed } = await authClient.signIn.emailOtp({ email, otp: code })
    setBusy(false)
    if (failed) {
      setError("That code did not work. Check the latest email, or request a new code.")
      return
    }
    router.push("/admin/enrol")
  }

  return (
    <div className="flex flex-col gap-6">
      {step === "start" && (
        <>
          <button type="button" className={primary} disabled={busy} onClick={() => void signInWithPasskey()}>
            {busy ? "Waiting for your passkey" : "Sign in with passkey"}
          </button>
          <button type="button" className={secondary} onClick={() => { setStep("email") }}>
            New device? Set it up with an email code
          </button>
        </>
      )}
      {step === "email" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void sendCode() }}>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Staff email</span>
            <input className={field} type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value) }} />
          </label>
          <button type="submit" className={primary} disabled={busy}>
            {busy ? "Sending code" : "Send code"}
          </button>
          <button type="button" className={secondary} onClick={() => { setStep("start") }}>
            Use a passkey instead
          </button>
        </form>
      )}
      {step === "code" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void verifyCode() }}>
          <p className="text-muted">If {email} is a staff account without a passkey, a 6-digit code is on its way. It works for 5 minutes.</p>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Code</span>
            <input
              className={`${field} tracking-[0.3em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")) }}
            />
          </label>
          <button type="submit" className={primary} disabled={busy}>
            {busy ? "Checking" : "Continue"}
          </button>
          <button type="button" className={secondary} onClick={() => { setStep("email") }}>
            Send a new code
          </button>
        </form>
      )}
      <p role="alert" aria-live="polite" className="min-h-6 text-sm text-danger">
        {error}
      </p>
    </div>
  )
}
