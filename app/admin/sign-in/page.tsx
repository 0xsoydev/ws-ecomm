import type { Metadata } from "next"
import { Suspense } from "react"
import { AdminFrame } from "../admin-frame"
import { SignInForm } from "./sign-in-form"

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false, follow: false } }

export default function SignInPage() {
  return (
    <AdminFrame title="Admin sign-in">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AdminFrame>
  )
}
