import type { Metadata } from "next"
import { Suspense } from "react"
import { requireRole, rolesOf } from "@/lib/auth"
import { AdminFrame } from "./admin-frame"
import { SignOutButton } from "./sign-out-button"

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } }

export default function AdminHome() {
  return (
    <AdminFrame title="Admin">
      <Suspense fallback={<p className="text-muted">Checking your session</p>}>
        <Home />
      </Suspense>
    </AdminFrame>
  )
}

async function Home() {
  const { user } = await requireRole("owner", "staff")
  return (
    <div className="flex flex-col gap-6">
      <p>
        Signed in as {user.name} ({rolesOf(user.role).join(", ")}) with a passkey.
      </p>
      <p className="text-muted">Orders, products and photos arrive here in the next phases.</p>
      <SignOutButton />
    </div>
  )
}
