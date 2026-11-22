"use client"

import Link from "next/link"
import { useActionState, useEffect } from "react"
import { changePassword } from "./actions"

const field = "h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base"
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-control border border-ink bg-accent px-5 font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-60"

export function PasswordForm({ email, forced }: { email: string; forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, { error: "", done: false })
  useEffect(() => {
    if (state.done) window.location.replace(new URL("/admin", window.location.origin))
  }, [state.done])
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-muted">{forced ? `Signed in as ${email} with a temporary password. Set your own to continue.` : `Signed in as ${email}.`}</p>
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <label className="flex flex-col gap-2">
        <span className="font-semibold">{forced ? "Temporary password" : "Current password"}</span>
        <input className={field} type="password" name="currentPassword" autoComplete="current-password" required />
      </label>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">New password</span>
          <input className={field} type="password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={128} required aria-describedby="password-rule" />
        </label>
        <span id="password-rule" className="text-sm text-muted">
          At least 12 characters. A short sentence you will remember works well.
        </span>
      </div>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">New password again</span>
        <input className={field} type="password" name="confirm" autoComplete="new-password" required />
      </label>
      <button type="submit" className={primary} disabled={pending || state.done}>
        {pending || state.done ? "Saving" : "Save new password"}
      </button>
      <p role="alert" aria-live="polite" className="min-h-6 text-sm text-danger">
        {state.error}
      </p>
      {!forced && (
        <Link href="/admin" className="text-sm">
          Back to admin
        </Link>
      )}
    </form>
  )
}
