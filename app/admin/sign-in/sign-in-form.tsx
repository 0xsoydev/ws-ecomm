"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"

const field = "h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-control border border-ink bg-accent px-5 font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-60"
const secondary =
  "inline-flex h-12 w-full items-center justify-center rounded-control border border-line-strong bg-surface px-5 font-semibold transition-[background-color,transform] duration-200 ease-out active:scale-[0.96] disabled:opacity-60 [@media(hover:hover)]:hover:bg-bg"

export function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"credentials" | "code">("credentials")
  const [busy, setBusy] = useState<"passkey" | "password" | "code" | null>(null)
  const [error, setError] = useState(params.get("error") === "no-access" ? "This account has no admin access. Ask the owner to add you." : "")

  async function signInWithPasskey() {
    setBusy("passkey")
    setError("")
    const { error: failed } = await authClient.signIn.passkey()
    setBusy(null)
    if (failed) {
      setError("Passkey sign-in did not finish. Try again, or use your email and password.")
      return
    }
    router.push("/admin")
  }

  async function signInWithPassword() {
    setBusy("password")
    setError("")
    const { data, error: failed } = await authClient.signIn.email({ email: email.trim(), password })
    if (failed) {
      setBusy(null)
      setError(failed.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password do not match an admin account.")
      return
    }
    if ("twoFactorRedirect" in data && data.twoFactorRedirect) {
      await sendCode()
      setStep("code")
      setBusy(null)
      return
    }
    setBusy(null)
    router.push("/admin")
  }

  async function sendCode() {
    setError("")
    const { error: failed } = await authClient.twoFactor.sendOtp()
    if (failed) setError(failed.status === 429 ? "Too many codes requested. Wait a minute." : "The code could not be sent. Try again in a minute.")
  }

  async function verifyCode() {
    setBusy("code")
    setError("")
    const { error: failed } = await authClient.twoFactor.verifyOtp({ code: code.trim() })
    setBusy(null)
    if (failed) {
      setError(failed.status === 429 ? "Too many attempts. Wait a minute and try again." : "That code did not work. Check the latest email, or send a new code.")
      return
    }
    router.push("/admin")
  }

  if (step === "code") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void verifyCode()
        }}
      >
        <p className="text-muted">We emailed a 6-digit code to {email.trim()}. It works for 5 minutes.</p>
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
        <button type="submit" className={primary} disabled={busy !== null}>
          {busy === "code" ? "Checking" : "Sign in"}
        </button>
        <button type="button" className="text-sm underline" onClick={() => void sendCode()}>
          Send a new code
        </button>
        <p role="alert" aria-live="polite" className="min-h-6 text-sm text-danger">
          {error}
        </p>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <button type="button" className={primary} disabled={busy !== null} onClick={() => void signInWithPasskey()}>
        {busy === "passkey" ? "Waiting for your passkey" : "Sign in with passkey"}
      </button>
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void signInWithPassword()
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Email</span>
          <input className={field} type="email" autoComplete="username" required value={email} onChange={(e) => { setEmail(e.target.value) }} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Password</span>
          <input className={field} type="password" autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value) }} />
        </label>
        <button type="submit" className={secondary} disabled={busy !== null}>
          {busy === "password" ? "Signing in" : "Sign in with password"}
        </button>
      </form>
      <p role="alert" aria-live="polite" className="min-h-6 text-sm text-danger">
        {error}
      </p>
    </div>
  )
}
