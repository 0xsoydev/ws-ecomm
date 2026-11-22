import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import { Suspense } from "react"
import { passkey } from "@/lib/auth-schema"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { AdminFrame } from "../admin-frame"
import { EnrolPasskey } from "./enrol-passkey"

export const metadata: Metadata = { title: "Add a passkey", robots: { index: false, follow: false } }

export default function EnrolPage() {
  return (
    <AdminFrame title="Add a passkey">
      <Suspense fallback={<p className="text-muted">Checking your session</p>}>
        <Enrol />
      </Suspense>
    </AdminFrame>
  )
}

async function Enrol() {
  const { user } = await requireRole("owner", "staff")
  const existing = await db.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, user.id))
  return <EnrolPasskey count={existing.length} />
}
