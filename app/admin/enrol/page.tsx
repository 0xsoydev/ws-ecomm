import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { passkey } from "@/lib/auth-schema"
import { getAdminSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { AdminFrame } from "../admin-frame"
import { EnrolPasskey } from "./enrol-passkey"

export const metadata: Metadata = { title: "Set up a passkey", robots: { index: false, follow: false } }

export default function EnrolPage() {
  return (
    <AdminFrame title="Set up a passkey">
      <Suspense fallback={<p className="text-muted">Checking your session</p>}>
        <Enrol />
      </Suspense>
    </AdminFrame>
  )
}

async function Enrol() {
  const current = await getAdminSession()
  if (!current) redirect("/admin/sign-in")
  if (current.session.authMethod === "passkey") redirect("/admin")
  const existing = await db.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, current.user.id)).limit(1)
  return <EnrolPasskey email={current.user.email} hasPasskey={existing.length > 0} />
}
