import type { Metadata } from "next"
import { Suspense } from "react"
import { AdminNav, AdminNavView } from "./admin-nav"

export const metadata: Metadata = { title: { default: "Admin", template: "%s | WS Green admin" }, robots: { index: false, follow: false } }

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={<AdminNavView pathname={null} />}>
        <AdminNav />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">{children}</main>
    </div>
  )
}
