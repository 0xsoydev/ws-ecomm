import { createHash, timingSafeEqual } from "node:crypto"
import { asc, desc, eq } from "drizzle-orm"
import { Check, Phone } from "lucide-react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Placeholder from "@/components/Placeholder"
import ProductImage from "@/components/ProductImage"
import { ProductSkeleton } from "@/components/Skeletons"
import WhatsAppIcon from "@/components/WhatsAppIcon"
import { BUSINESS } from "@/lib/business"
import { db } from "@/lib/db"
import { publicEnv } from "@/lib/env.public"
import { formatPaise, unitWord } from "@/lib/format"
import { orderId, orderMessage, orderNumber, STAGE_LABEL } from "@/lib/orders"
import { orderItems, orders, products, shipments } from "@/lib/schema"
import { catalog } from "@/lib/storefront"
import { button } from "@/lib/ui"
import { telLink, waLink } from "@/lib/whatsapp"

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } }

export default function OrderRoute({ params }: PageProps<"/order/[number]">) {
  return (
    <div className="mx-auto max-w-[800px] px-4 sm:px-6">
      <Suspense fallback={<ProductSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

function matches(secret: string | undefined, hash: string | null) {
  if (!secret || !hash) return false
  const a = Buffer.from(createHash("sha256").update(secret).digest("hex"))
  const b = Buffer.from(hash)
  return a.length === b.length && timingSafeEqual(a, b)
}

const METHOD = { pay_at_store: "Pay at the shop, cash or UPI", upi_manual: "UPI after we confirm", cash_on_local_delivery: "Cash on delivery", cod_courier: "Cash on delivery", razorpay: "Paid online", payment_link: "Payment link" } as const

async function Content({ params }: { params: PageProps<"/order/[number]">["params"] }) {
  const { number } = await params
  const id = orderId(number)
  if (id === null) notFound()
  const jar = await cookies()
  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (!order) notFound()
  if (!matches(jar.get(`ws_order_${String(id)}`)?.value, order.cookieHash)) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <h1 className="text-2xl">Order {orderNumber(id)}</h1>
        <p className="max-w-[56ch] text-muted">This order can only be opened on the phone it was placed from. Ask us on WhatsApp for its status.</p>
        <a href={waLink(`Hi, what is the status of order ${orderNumber(id)}?`)} target="_blank" rel="noopener" className={`${button.ink} no-underline`}>
          <WhatsAppIcon className="size-4.5" />
          Ask on WhatsApp
        </a>
      </div>
    )
  }

  const [items, [shipment], data] = await Promise.all([
    db.select({ item: orderItems, slug: products.slug }).from(orderItems).innerJoin(products, eq(products.id, orderItems.productId)).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db.select().from(shipments).where(eq(shipments.orderId, id)).orderBy(desc(shipments.createdAt)).limit(1),
    catalog(),
  ])
  const tiles = new Map(data.tiles.map((t) => [t.id, t]))
  const contact = "name" in order.contact ? order.contact : null
  const ship = order.shipTo && "line1" in order.shipTo ? order.shipTo : null
  const deliveryPending = order.stage === "quote_pending"
  const waiting = order.stage === "requested" || order.stage === "quote_pending"
  const num = orderNumber(id)
  const message = orderMessage({
    number: num,
    lines: items.map(({ item }) => ({ name: item.name, code: tiles.get(item.productId)?.code ?? null, qty: item.qty, unit: item.unit, unitPaise: item.unitPaise, tier: item.tier, hasRetail: tiles.get(item.productId)?.priced.retailPaise != null })),
    itemsPaise: order.itemsPaise,
    chargesPaise: order.chargesPaise,
    deliveryPending,
    name: contact?.name ?? "",
    delivery: order.delivery === "pickup" ? "pickup" : "ship",
    pincode: ship?.pincode ?? null,
    link: `${publicEnv.NEXT_PUBLIC_SITE_URL}/order/${num}`,
  })
  const placed = order.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })

  return (
    <div className="flex flex-col gap-8 pt-6 lg:pt-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Placed {placed}</p>
        <h1 className="text-2xl lg:text-3xl">Order {num}</h1>
        <p className={`w-fit rounded-full border px-3 py-1 text-sm font-medium ${order.stage === "cancelled" ? "border-line-strong text-muted" : waiting ? "border-signal text-signal" : "border-ink"}`}>{STAGE_LABEL[order.stage]}</p>
      </div>

      {waiting ? (
        <section aria-labelledby="send" className="flex flex-col gap-4 rounded-container border border-line bg-surface p-5">
          <h2 id="send" className="text-lg">
            Your order is saved. Send it on WhatsApp so we can confirm.
          </h2>
          <ol className="flex flex-col gap-2 text-sm text-muted">
            <li>1. Send the order to our WhatsApp.</li>
            <li>2. We check stock and confirm within 1 hour, 9 am to 10 pm.</li>
            <li>3. {order.delivery === "pickup" ? "Pick it up at the shop" : "Pay by UPI, then we ship it"}{order.method === "pay_at_store" ? " and pay there." : "."}</li>
          </ol>
          <a href={waLink(message)} target="_blank" rel="noopener" className={`${button.big} w-full no-underline`}>
            <WhatsAppIcon className="size-5" />
            Send order on WhatsApp
          </a>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Phone aria-hidden className="size-4" strokeWidth={1.75} />
            No WhatsApp?{" "}
            <a href={telLink} className="font-medium text-ink">
              Call {BUSINESS.phone}
            </a>
          </p>
        </section>
      ) : null}

      {order.stage === "confirmed" && order.method === "upi_manual" && order.payment === "unpaid" ? (
        <section className="rounded-container border border-line bg-surface p-5">
          <h2 className="text-lg">Pay {formatPaise(order.totalPaise)} by UPI</h2>
          <p className="mt-1 text-sm text-muted">We sent our UPI details on WhatsApp. Send the payment reference there once you pay.</p>
        </section>
      ) : null}

      {shipment ? (
        <section className="flex flex-col gap-1 rounded-container border border-line bg-surface p-5 text-sm">
          <h2 className="text-lg">Shipped with {shipment.courier ?? "courier"}</h2>
          {shipment.awb ? <p>Tracking number {shipment.awb}</p> : null}
          {shipment.trackingUrl ? (
            <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-medium">
              Track the parcel
            </a>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="items" className="flex flex-col gap-3">
        <h2 id="items" className="text-lg">
          Items
        </h2>
        <ul className="divide-y divide-line rounded-container border border-line bg-surface">
          {items.map(({ item, slug }) => {
            const tile = tiles.get(item.productId)
            return (
              <li key={item.id} className="flex items-center gap-3 p-3">
                <Link href={`/p/${slug}`} tabIndex={-1} aria-hidden className="relative size-14 shrink-0 overflow-hidden rounded-control border border-line bg-well">
                  {tile?.image ? <ProductImage image={tile.image} alt="" sizes="56px" /> : <Placeholder systemSlug={tile?.systemSlug ?? ""} code={null} size="row" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col text-sm">
                  <Link href={`/p/${slug}`} className="line-clamp-2 font-medium no-underline [@media(hover:hover)]:hover:underline">
                    {item.name}
                  </Link>
                  <span className="text-muted">
                    {item.qty} {unitWord(item.unit, item.qty)} x {formatPaise(item.unitPaise)}
                    {item.tier === "wholesale" && tile?.priced.retailPaise != null ? ", wholesale" : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold">{formatPaise(item.linePaise)}</span>
              </li>
            )
          })}
        </ul>
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Items</dt>
            <dd>{formatPaise(order.itemsPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd>{order.delivery === "pickup" ? "Free pickup" : deliveryPending ? "To be confirmed" : formatPaise(order.chargesPaise)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">
              {formatPaise(order.totalPaise)}
              {deliveryPending ? <span className="font-normal text-muted"> + delivery</span> : null}
            </dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base">{order.delivery === "pickup" ? "Pickup" : "Delivery address"}</h2>
          {ship ? (
            <address className="text-muted not-italic">
              {ship.name}
              <br />
              {ship.line1}
              {ship.line2 ? `, ${ship.line2}` : ""}
              {ship.landmark ? `, near ${ship.landmark}` : ""}
              <br />
              {ship.city}, {ship.state} {ship.pincode}
            </address>
          ) : (
            <p className="text-muted">Gulab Auto Garage, 1 Akshardham Complex, near Milap Theatre, S.V. Road, Malad West. Open 9 am to 10 pm.</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-base">Payment</h2>
          <p className="text-muted">{METHOD[order.method]}</p>
          {order.payment === "paid" ? (
            <p className="flex items-center gap-1 font-medium">
              <Check aria-hidden className="size-4" strokeWidth={2.25} />
              Paid
            </p>
          ) : null}
        </div>
      </section>

      <p className="text-sm text-muted">
        Questions about this order?{" "}
        <a href={waLink(`Hi, I have a question about order ${num}.`)} target="_blank" rel="noopener" className="font-medium text-ink">
          Ask on WhatsApp
        </a>
      </p>
    </div>
  )
}
