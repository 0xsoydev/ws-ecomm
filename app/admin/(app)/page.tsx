import { eq, sql } from "drizzle-orm"
import { ChevronRight } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { requireRole, rolesOf } from "@/lib/auth"
import { ISSUES, purchasableIssues, type Issue } from "@/lib/catalog"
import { db } from "@/lib/db"
import { productImages, products, productVehicles } from "@/lib/schema"
import { getSettings, purchasableContext } from "@/lib/settings"
import { SignOutButton } from "./sign-out-button"

export default function AdminHome() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl">Home</h1>
        <Link href="/admin/settings" className="text-sm font-medium md:hidden">
          Shop settings
        </Link>
      </div>
      <Suspense fallback={<ReadinessSkeleton />}>
        <Readiness />
      </Suspense>
    </div>
  )
}

function ReadinessSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-container bg-surface" />
      ))}
    </div>
  )
}

function Meter({ label, value, total, floor, href, action }: { label: string; value: number; total: number; floor?: number; href: Route; action: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  const met = floor === undefined ? value === total : pct >= floor
  return (
    <li className="flex flex-col gap-2 border-b border-line py-4 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-semibold">{label}</span>
        <span>
          {value} of {total}
          <span className="text-muted"> ({pct}%)</span>
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
        <div className={`h-full rounded-full ${met ? "bg-accent" : "bg-signal-fill"}`} style={{ width: `${String(pct)}%` }} />
        {floor !== undefined && <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${String(floor)}%` }} />}
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted">{floor !== undefined ? `Launch needs ${String(floor)}%` : "Launch needs all of them"}</span>
        <Link href={href} className="inline-flex items-center gap-1 font-semibold">
          {action}
          <ChevronRight aria-hidden size={16} />
        </Link>
      </div>
    </li>
  )
}

async function Readiness() {
  const { user } = await requireRole("owner", "staff")
  const [rows, ctx, current, [images], [fits]] = await Promise.all([
    db
      .select({
        status: products.status,
        maker: products.maker,
        makerAddress: products.makerAddress,
        prePackaged: products.prePackaged,
        netQuantity: products.netQuantity,
        mrpPaise: products.mrpPaise,
        batteryKind: products.batteryKind,
        bisRegistration: products.bisRegistration,
        bisVerifiedAt: products.bisVerifiedAt,
        priceApproved: products.priceApproved,
        hsn: products.hsn,
        ownPhoto: sql<boolean>`exists (select 1 from ${productImages} i where i.product_id = ${products.id} and i.own_photo)`,
      })
      .from(products),
    purchasableContext(),
    getSettings(),
    db.select({ unsorted: sql<number>`count(*) filter (where not ${productImages.classified})::int` }).from(productImages),
    db.select({ unchecked: sql<number>`count(distinct ${productVehicles.productId})::int` }).from(productVehicles).where(eq(productVehicles.verified, false)),
  ])
  const active = rows.filter((r) => r.status === "active")
  const issues = active.map((r) => purchasableIssues(r, ctx))
  const purchasable = issues.filter((i) => i.length === 0).length
  const counts = new Map<Issue, number>()
  for (const list of issues) for (const issue of list) counts.set(issue, (counts.get(issue) ?? 0) + 1)
  const blockers = [...counts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <>
      <section aria-labelledby="readiness" className="flex flex-col gap-4">
        <h2 id="readiness" className="text-lg">
          Ready to launch
        </h2>
        <ul className="flex flex-col">
          <Meter label="Prices approved" value={active.filter((r) => r.priceApproved).length} total={active.length} href="/admin/products?view=prices" action="Approve prices" />
          <Meter label="Own photos" value={active.filter((r) => r.ownPhoto).length} total={active.length} floor={current.launchFloors.ownPhotoPct} href="/admin/products?view=photos" action={`Sort ${String(images?.unsorted ?? 0)} photos`} />
          <Meter label="Buyable online" value={purchasable} total={active.length} floor={current.launchFloors.purchasablePct} href="/admin/products?view=fix" action="Open not buyable" />
        </ul>
        {fits?.unchecked ? (
          <Link href="/admin/products?view=vehicles" className="inline-flex items-center gap-1 self-start text-sm font-semibold">
            Check vehicles on {fits.unchecked} {fits.unchecked === 1 ? "product" : "products"}
            <ChevronRight aria-hidden size={16} />
          </Link>
        ) : null}
      </section>
      {blockers.length > 0 && (
        <section aria-labelledby="blockers" className="flex flex-col gap-3">
          <h2 id="blockers" className="text-lg">
            What stops products being buyable
          </h2>
          <ul className="flex flex-col">
            {blockers.map(([issue, n]) => (
              <li key={issue}>
                <Link
                  href={{ pathname: "/admin/products", query: { view: "fix", issue } }}
                  className="flex h-12 items-center justify-between gap-4 border-b border-line no-underline transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-muted"
                >
                  <span>{ISSUES[issue]}</span>
                  <span className="inline-flex items-center gap-1">
                    {n}
                    <ChevronRight aria-hidden size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-6 text-sm text-muted">
        <span className="min-w-0 flex-1 basis-full sm:basis-auto">
          {user.email}, {rolesOf(user.role).join(", ")}
        </span>
        <Link href="/admin/enrol" className="text-ink">
          Add a passkey
        </Link>
        <Link href="/admin/password" className="text-ink">
          Change password
        </Link>
        <SignOutButton />
      </footer>
    </>
  )
}
