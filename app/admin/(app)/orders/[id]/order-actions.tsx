"use client"

import { useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"
import { parseRupees } from "@/lib/format"
import type { Stage } from "@/lib/orders"
import { button, field } from "@/lib/ui"
import { cancelOrder, confirmOrder, markShipped, moveStage, recordUpi, type ActionResult } from "../actions"

type Props = {
  id: number
  stage: Stage
  delivery: "pickup" | "ship" | "local" | "freight"
  method: string
  payment: string
  duePaise: number
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-container border border-line bg-surface p-4">
      <h2 className="text-base">{title}</h2>
      {children}
    </section>
  )
}

export default function OrderActions({ id, stage, delivery, method, payment, duePaise }: Props) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const act = (work: () => Promise<ActionResult>, done: string) => {
    setError(null)
    start(async () => {
      const r = await work()
      if (r.ok) toast(done)
      else setError(r.message)
    })
  }
  const text = (form: FormData, key: string) => {
    const v = form.get(key)
    return typeof v === "string" ? v.trim() : ""
  }
  const needsUpi = method === "upi_manual" && payment !== "paid" && (stage === "confirmed" || stage === "quote_pending" || stage === "requested")
  const canCancel = ["requested", "quote_pending", "confirmed", "packed", "ready_for_pickup"].includes(stage) && (payment === "unpaid" || payment === "pay_at_store")

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="rounded-control border border-danger/60 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {stage === "requested" || stage === "quote_pending" ? (
        <Panel title="Confirm the order">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const raw = text(form, "delivery")
              const deliveryPaise = stage === "quote_pending" ? parseRupees(raw === "" ? "x" : raw) : null
              if (stage === "quote_pending" && deliveryPaise === null) {
                setError("Enter the delivery charge in rupees, 0 if free.")
                return
              }
              act(() => confirmOrder({ id, deliveryPaise }), "Order confirmed")
            }}
          >
            <p className="text-sm text-muted">Check every part is on the shelf, then confirm. Send the customer the confirmation on WhatsApp.</p>
            {stage === "quote_pending" ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Delivery charge (₹)
                <input name="delivery" inputMode="decimal" className={field} placeholder="For example 80" />
              </label>
            ) : null}
            <button type="submit" disabled={pending} className={button.primary}>
              Confirm order
            </button>
          </form>
        </Panel>
      ) : null}

      {needsUpi && stage === "confirmed" ? (
        <Panel title="Record the UPI payment">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const amount = parseRupees(text(form, "amount"))
              if (amount === null) {
                setError("Enter the amount received.")
                return
              }
              act(() => recordUpi({ id, utr: text(form, "utr").replace(/\s/g, ""), amountPaise: amount }), "Payment recorded")
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              UPI reference (UTR, 12 digits)
              <input name="utr" inputMode="numeric" maxLength={14} className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Amount received (₹)
              <input name="amount" inputMode="decimal" defaultValue={String(duePaise / 100)} className={field} />
            </label>
            <button type="submit" disabled={pending} className={button.primary}>
              Record payment
            </button>
          </form>
        </Panel>
      ) : null}

      {stage === "confirmed" && !needsUpi ? (
        <Panel title={delivery === "pickup" ? "Get it ready" : "Pack it"}>
          <button
            type="button"
            disabled={pending}
            className={button.primary}
            onClick={() => {
              act(() => moveStage({ id, from: stage, to: delivery === "pickup" ? "ready_for_pickup" : "packed" }), delivery === "pickup" ? "Marked ready for pickup" : "Marked packed")
            }}
          >
            {delivery === "pickup" ? "Mark ready for pickup" : "Mark packed"}
          </button>
        </Panel>
      ) : null}

      {stage === "packed" ? (
        <Panel title="Ship it">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              act(() => markShipped({ id, courier: text(form, "courier"), awb: text(form, "awb"), trackingUrl: text(form, "trackingUrl") }), "Marked shipped")
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Courier
              <input name="courier" className={field} placeholder="For example DTDC" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Tracking number
              <input name="awb" className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Tracking link (optional)
              <input name="trackingUrl" type="url" className={field} />
            </label>
            <button type="submit" disabled={pending} className={button.primary}>
              Mark shipped
            </button>
          </form>
        </Panel>
      ) : null}

      {stage === "ready_for_pickup" ? (
        <Panel title="Hand it over">
          <p className="text-sm text-muted">{method === "pay_at_store" ? "Collect the payment, then mark it picked up." : "Mark it picked up when the customer collects it."}</p>
          <button
            type="button"
            disabled={pending}
            className={button.primary}
            onClick={() => {
              act(() => moveStage({ id, from: stage, to: "picked_up" }), "Marked picked up")
            }}
          >
            {method === "pay_at_store" ? "Paid and picked up" : "Mark picked up"}
          </button>
        </Panel>
      ) : null}

      {stage === "shipped" ? (
        <Panel title="Delivered?">
          <button
            type="button"
            disabled={pending}
            className={button.secondary}
            onClick={() => {
              act(() => moveStage({ id, from: stage, to: "delivered" }), "Marked delivered")
            }}
          >
            Mark delivered
          </button>
        </Panel>
      ) : null}

      {canCancel ? (
        cancelling ? (
          <Panel title="Cancel this order">
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const form = new FormData(e.currentTarget)
                act(() => cancelOrder({ id, reason: text(form, "reason") }), "Order cancelled")
              }}
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Reason
                <input name="reason" className={field} placeholder="For example out of stock" />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className={`${button.secondary} text-danger`}>
                  Cancel order
                </button>
                <button
                  type="button"
                  className={button.secondary}
                  onClick={() => {
                    setCancelling(false)
                  }}
                >
                  Keep order
                </button>
              </div>
            </form>
          </Panel>
        ) : (
          <button
            type="button"
            className="self-start text-sm font-medium text-danger underline underline-offset-2"
            onClick={() => {
              setCancelling(true)
            }}
          >
            Cancel this order
          </button>
        )
      ) : null}
    </div>
  )
}
