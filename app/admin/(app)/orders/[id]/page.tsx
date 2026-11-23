import { asc, eq } from "drizzle-orm"
import { ChevronLeft, Phone } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import WhatsAppIcon from "@/components/WhatsAppIcon"
import { requireRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatPaise, unitWord } from "@/lib/format"
import { orderNumber, STAGE_LABEL } from "@/lib/orders"
import { orderEvents, orderItems, orders, payments, shipments } from "@/lib/schema"
import { getSettings } from "@/lib/settings"
import { button } from "@/lib/ui"
import OrderActions from "./order-actions"

export const metadata: Metadata = { title: "Order" }

const METHOD: Record<string, string> = { pay_at_store: "Pay at the shop", upi_manual: "UPI after confirmation" }

export default function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-5">
      <Link href="/admin/orders" className="flex w-fit items-center gap-0.5 text-sm text-muted no-underline">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
        Orders
      </Link>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  )
}

async function Detail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  await requireRole("owner", "staff")
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (!order) notFound()
  const [items, paid, [shipment], events, settings] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(asc(payments.at)),
    db.select().from(shipments).where(eq(shipments.orderId, id)).limit(1),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.at)),
    getSettings(),
  ])
  const contact = "name" in order.contact ? order.contact : null
  const ship = order.shipTo && "line1" in order.shipTo ? order.shipTo : null
  const num = orderNumber(id)
  const received = paid.filter((p) => p.status === "captured").reduce((s, p) => s + p.amountPaise, 0)
  const upi = settings.upiVpa ?? "[our UPI ID]"
  const confirmText =
    order.delivery === "pickup"
      ? `Hi ${contact?.name ?? ""}, your order ${num} is confirmed. Total ${formatPaise(order.totalPaise)}. ${order.method === "upi_manual" ? `Pay by UPI to ${upi} with the note ${num}, then send the 12-digit UTR here. ` : ""}Pick it up at Gulab Auto Garage, near Milap Theatre, S.V. Road, Malad West, 9 am to 10 pm.`
      : `Hi ${contact?.name ?? ""}, your order ${num} is confirmed. Total with delivery ${formatPaise(order.totalPaise)}. Pay by UPI to ${upi} with the note ${num}, then send the 12-digit UTR here. We ship once the payment is in.`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Order {num}</h1>
          <p className="text-sm text-muted">
            {order.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}. {STAGE_LABEL[order.stage]}.
          </p>
        </div>

        <section className="flex flex-col gap-2 rounded-container border border-line bg-surface p-4">
          <h2 className="text-base">Customer</h2>
          <p>
            {contact?.name} <span className="text-muted">+91 {contact?.phone}</span>
          </p>
          {contact?.email ? <p className="text-sm text-muted">{contact.email}</p> : null}
          {contact?.businessName || contact?.gstin ? <p className="text-sm text-muted">{[contact.businessName, contact.gstin ? `GSTIN ${contact.gstin}` : null].filter(Boolean).join(", ")}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {contact ? (
              <>
                <a href={`https://wa.me/91${contact.phone}?text=${encodeURIComponent(confirmText)}`} target="_blank" rel="noopener" className={`${button.secondary} no-underline`}>
                  <WhatsAppIcon className="size-4.5" />
                  Send confirmation
                </a>
                <a href={`tel:+91${contact.phone}`} className={`${button.secondary} no-underline`}>
                  <Phone aria-hidden className="size-4.5" strokeWidth={1.75} />
                  Call
                </a>
              </>
            ) : null}
          </div>
          {order.consent.whatsappUpdates ? <p className="text-xs text-muted">Agreed to WhatsApp updates.</p> : null}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base">Items</h2>
          <ul className="divide-y divide-line rounded-container border border-line bg-surface">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/admin/products/${String(i.productId)}`} className="font-medium">
                    {i.name}
                  </Link>
                  <span className="text-muted">
                    {i.sku}, {i.qty} {unitWord(i.unit, i.qty)} x {formatPaise(i.unitPaise)}, {i.tier}
                    {i.reserved ? ", stock reserved" : ", check the shelf"}
                  </span>
                </div>
                <span className="font-semibold">{formatPaise(i.linePaise)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Items</dt>
              <dd>{formatPaise(order.itemsPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{order.stage === "quote_pending" ? "Not set yet" : formatPaise(order.chargesPaise)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatPaise(order.totalPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Received</dt>
              <dd>{formatPaise(received)}</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 rounded-container border border-line bg-surface p-4 text-sm sm:grid-cols-2">
          <div>
            <h2 className="text-base">{order.delivery === "pickup" ? "Pickup" : "Ship to"}</h2>
            {ship ? (
              <address className="text-muted not-italic">
                {ship.line1}
                {ship.line2 ? `, ${ship.line2}` : ""}
                {ship.landmark ? `, near ${ship.landmark}` : ""}
                <br />
                {ship.city}, {ship.state} {ship.pincode}
              </address>
            ) : (
              <p className="text-muted">At the shop</p>
            )}
            {shipment ? (
              <p className="mt-2">
                {shipment.courier}, {shipment.awb}
              </p>
            ) : null}
          </div>
          <div>
            <h2 className="text-base">Payment</h2>
            <p className="text-muted">
              {METHOD[order.method] ?? order.method}, {order.payment.replace(/_/g, " ")}
            </p>
            {paid.map((p) => (
              <p key={p.id} className="text-muted">
                {formatPaise(p.amountPaise)} {p.utr ? `UTR ${p.utr}` : (p.method ?? "")}
              </p>
            ))}
          </div>
          {order.customerNote ? (
            <div className="sm:col-span-2">
              <h2 className="text-base">Note</h2>
              <p className="text-muted">{order.customerNote}</p>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base">History</h2>
          <ol className="flex flex-col gap-1 text-sm text-muted">
            {events.map((e) => (
              <li key={e.id}>
                {e.at.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}: {e.type}
                {typeof e.data.to === "string" ? ` to ${e.data.to.replace(/_/g, " ")}` : ""}
                {typeof e.data.reason === "string" ? `, ${e.data.reason}` : ""}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="lg:sticky lg:top-8">
        <OrderActions id={id} stage={order.stage} delivery={order.delivery} method={order.method} payment={order.payment} duePaise={Math.max(0, order.totalPaise - received)} />
      </div>
    </div>
  )
}
