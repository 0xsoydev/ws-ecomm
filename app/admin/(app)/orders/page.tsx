import { desc, inArray } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatPaise } from "@/lib/format"
import { orderNumber, type Stage } from "@/lib/orders"
import { orders } from "@/lib/schema"
import { chip } from "@/lib/ui"

export const metadata: Metadata = { title: "Orders" }

const VIEWS = {
  new: { label: "To confirm", stages: ["requested", "quote_pending"] },
  active: { label: "In progress", stages: ["confirmed", "packed", "ready_for_pickup", "shipped"] },
  done: { label: "Done", stages: ["delivered", "picked_up"] },
  cancelled: { label: "Cancelled", stages: ["cancelled"] },
} as const satisfies Record<string, { label: string; stages: readonly Stage[] }>

type View = keyof typeof VIEWS

const STAGE_SHORT: Partial<Record<Stage, string>> = {
  requested: "New",
  quote_pending: "New, needs delivery charge",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  ready_for_pickup: "Ready for pickup",
  delivered: "Delivered",
  picked_up: "Picked up",
  cancelled: "Cancelled",
}

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-5">
      <h1 className="text-2xl">Orders</h1>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireRole("owner", "staff")
  const raw = (await searchParams).view
  const view: View = raw === "active" || raw === "done" || raw === "cancelled" ? raw : "new"
  const rows = await db
    .select({ id: orders.id, stage: orders.stage, contact: orders.contact, delivery: orders.delivery, totalPaise: orders.totalPaise, payment: orders.payment, createdAt: orders.createdAt })
    .from(orders)
    .where(inArray(orders.stage, [...VIEWS[view].stages]))
    .orderBy(desc(orders.createdAt))
    .limit(200)
  return (
    <>
      <nav aria-label="Order views" className="flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as View[]).map((k) => (
          <Link key={k} href={`/admin/orders?view=${k}`} aria-current={k === view ? "page" : undefined} className={`${chip(k === view)} h-9 no-underline`}>
            {VIEWS[k].label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-container border border-line bg-surface p-5 text-muted">No orders here.</p>
      ) : (
        <ul className="divide-y divide-line rounded-container border border-line bg-surface">
          {rows.map((o) => {
            const contact = "name" in o.contact ? o.contact : null
            return (
              <li key={o.id}>
                <Link href={`/admin/orders/${String(o.id)}`} className="flex items-center gap-3 p-4 no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-bg">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">
                      {orderNumber(o.id)} <span className="font-normal text-muted">{contact?.name}</span>
                    </span>
                    <span className="text-sm text-muted">
                      {o.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}, {o.delivery === "pickup" ? "pickup" : "courier"}
                      {o.payment === "paid" ? ", paid" : ""}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">{formatPaise(o.totalPaise)}</span>
                    <span className="text-sm text-muted">{STAGE_SHORT[o.stage] ?? o.stage}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
