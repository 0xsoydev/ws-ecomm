import type { Metadata } from "next"
import { Suspense } from "react"
import { requireSession } from "@/lib/auth"
import { AdminFrame } from "../admin-frame"
import { PasswordForm } from "./password-form"

export const metadata: Metadata = { title: "Change password", robots: { index: false, follow: false } }

export default function PasswordPage() {
  return (
    <AdminFrame title="Change password">
      <Suspense fallback={<p className="text-muted">Checking your session</p>}>
        <Form />
      </Suspense>
    </AdminFrame>
  )
}

async function Form() {
  const { user } = await requireSession()
  return <PasswordForm email={user.email} forced={user.mustChangePassword} />
}
