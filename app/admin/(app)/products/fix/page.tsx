import type { Metadata } from "next"
import { Suspense } from "react"
import { requireRole } from "@/lib/auth"
import { ISSUES, type Issue } from "@/lib/catalog"
import { loadProductRows } from "../load"
import { FixQueue } from "./fix-queue"

export const metadata: Metadata = { title: "Fix queue" }

export default function FixPage({ searchParams }: PageProps<"/admin/products/fix">) {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">Fix queue</h1>
        <p className="max-w-[60ch] text-muted">Pick what is missing, tick the products it applies to, and fill it in once for all of them.</p>
      </div>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Queue({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [, params] = await Promise.all([requireRole("owner", "staff"), searchParams])
  const rows = await loadProductRows()
  const requested = typeof params.issue === "string" && params.issue in ISSUES ? (params.issue as Issue) : null
  return <FixQueue rows={rows.filter((r) => r.status === "active")} initialIssue={requested} />
}
