"use client"

import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center justify-center self-start rounded-control border border-line-strong bg-surface px-5 font-semibold transition-colors duration-200 ease-out hover:bg-bg"
      onClick={() => void authClient.signOut().then(() => { router.push("/admin/sign-in") })}
    >
      Sign out
    </button>
  )
}
