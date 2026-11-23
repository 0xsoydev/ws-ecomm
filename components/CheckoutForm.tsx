"use client"

import NumberFlow from "@number-flow/react"
import { LoaderCircle, Store, Truck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition, type ReactNode, type SubmitEvent } from "react"
import { placeOrder, type CheckoutResult } from "@/app/(store)/checkout/actions"
import { clearCart, useCart } from "@/lib/cart"
import { courierFee } from "@/lib/delivery"
import { formatPaise, unitWord } from "@/lib/format"
import { unitPrice } from "@/lib/pricing"
import { useSnapshot } from "@/lib/snapshot"
import type { Tile } from "@/lib/storefront"
import { button, field } from "@/lib/ui"
import { useStored, writeStored } from "@/lib/use-stored"
import Placeholder from "./Placeholder"
import ProductImage from "./ProductImage"

const rupees = { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 } as const
const SAVED = "ws-contact"

type Saved = { name: string; phone: string; email: string; line1: string; line2: string; landmark: string; city: string; pincode: string }

function readSaved(raw: string | null): Saved | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (typeof v !== "object" || v === null) return null
    const get = (k: keyof Saved) => {
      const x = (v as Record<string, unknown>)[k]
      return typeof x === "string" ? x : ""
    }
    return { name: get("name"), phone: get("phone"), email: get("email"), line1: get("line1"), line2: get("line2"), landmark: get("landmark"), city: get("city"), pincode: get("pincode") }
  } catch {
    return null
  }
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

function Choice({ name, value, checked, onChange, disabled, icon, title, detail }: { name: string; value: string; checked: boolean; onChange: () => void; disabled?: boolean; icon: ReactNode; title: string; detail: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors duration-150 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus) ${checked ? "border-2 border-ink p-[15px]" : "border-line-strong"} ${disabled ? "cursor-not-allowed opacity-55" : "[@media(hover:hover)]:hover:bg-bg"}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <span className="mt-0.5 text-muted">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
    </label>
  )
}

export default function CheckoutForm({ scope, courier, minOrderPaise, rates }: { scope: string; courier: boolean; minOrderPaise: number; rates: Parameters<typeof courierFee>[0] }) {
  const lines = useCart()
  const { data, failed, retry } = useSnapshot(lines.length > 0)
  const saved = readSaved(useStored(SAVED))
  const router = useRouter()
  const key = useRef<string | null>(null)
  const [pending, start] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<ReactNode>(null)
  const [delivery, setDelivery] = useState<"pickup" | "ship">(courier ? "ship" : "pickup")
  const [payment, setPayment] = useState<"pay_at_store" | "upi_manual">("pay_at_store")

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-lg">Your cart is empty.</p>
        <Link href="/" className={`${button.secondary} no-underline`}>
          Browse parts
        </Link>
      </div>
    )
  }
  if (!data) {
    return failed ? (
      <div className="flex flex-col items-start gap-3 py-10">
        <p>Prices did not load.</p>
        <button type="button" onClick={retry} className={button.secondary}>
          Try again
        </button>
      </div>
    ) : (
      <div aria-hidden className="mt-6 h-96 rounded-container bg-line/50 motion-safe:animate-pulse" />
    )
  }

  const byId = new Map(data.tiles.map((t) => [t.id, t]))
  const priced = lines.flatMap((l) => {
    const tile = byId.get(l.id)
    if (!tile || !tile.purchasable) return []
    try {
      const p = unitPrice(tile.priced, l.qty)
      return [{ line: l, tile, unitPaise: p.paise }]
    } catch {
      return []
    }
  })
  const dropped = lines.filter((l) => !priced.some((p) => p.line.id === l.id)).map((l) => byId.get(l.id)?.name ?? "A part that is no longer listed")
  const itemsPaise = priced.reduce((s, p) => s + p.unitPaise * p.line.qty, 0)
  const pickupOnly = priced.filter((p) => p.tile.pickupOnly)
  const shipBlocked = !courier || pickupOnly.length > 0
  const mode = shipBlocked ? "pickup" : delivery
  const method = mode === "ship" ? "upi_manual" : payment
  const belowMinimum = itemsPaise < minOrderPaise
  const fee = mode === "ship" ? courierFee(rates, itemsPaise) : 0
  const totalPaise = itemsPaise + (fee ?? 0)
  const shipFee = courierFee(rates, itemsPaise)

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const text = (k: string) => {
      const v = form.get(k)
      return typeof v === "string" ? v.trim() : ""
    }
    const payload = {
      idempotencyKey: (key.current ??= crypto.randomUUID()),
      name: text("name"),
      phone: text("phone").replace(/\D/g, "").slice(-10),
      email: text("email"),
      delivery: mode,
      line1: text("line1"),
      line2: text("line2"),
      landmark: text("landmark"),
      city: text("city"),
      pincode: text("pincode"),
      payment: method,
      note: text("note"),
      whatsappUpdates: form.get("updates") === "on",
      lines: priced.map((p) => ({ id: p.line.id, qty: p.line.qty, unitPaise: p.unitPaise })),
    }
    const remember = form.get("remember") === "on"
    setNotice(null)
    start(async () => {
      let result: CheckoutResult
      try {
        result = await placeOrder(payload)
      } catch {
        setNotice("The order did not go through. Check your connection and try again.")
        return
      }
      if (result.ok) {
        writeStored(SAVED, remember ? JSON.stringify({ name: payload.name, phone: payload.phone, email: payload.email, line1: payload.line1, line2: payload.line2, landmark: payload.landmark, city: payload.city, pincode: payload.pincode }) : null)
        clearCart()
        router.replace(`/order/${result.number}`)
        return
      }
      if (result.kind === "fields") {
        setErrors(result.fields)
        const first = Object.keys(result.fields)[0]
        if (first) document.getElementById(`co-${first}`)?.focus()
        return
      }
      setErrors({})
      if (result.kind === "message") setNotice(result.message)
      if (result.kind === "stock") {
        const names = result.ids.map((id) => byId.get(id)?.name ?? "A part").join(", ")
        setNotice(
          <>
            Not enough stock for {names}.{" "}
            <Link href="/cart" className="font-semibold">
              Update your cart
            </Link>
          </>,
        )
      }
      if (result.kind === "price") {
        setNotice(
          <>
            Some prices changed since you added these parts.{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                window.location.reload()
              }}
            >
              Review the new prices
            </button>
          </>,
        )
      }
    })
  }

  const err = (k: string) => errors[k]
  const described = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `co-${k}-error` } : {})

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 text-lg font-semibold">Your details</legend>
          <Field id="co-phone" label="Mobile number" error={err("phone")} hint="We confirm the order on WhatsApp or by phone.">
            <div className="flex">
              <span className="flex h-11 items-center rounded-l-control border border-r-0 border-line-strong bg-bg px-3 text-muted">+91</span>
              <input id="co-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required defaultValue={saved?.phone} maxLength={14} className={`${field} rounded-l-none`} {...described("phone")} />
            </div>
          </Field>
          <label className="-mt-1 flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" name="updates" className="mt-0.5 size-5 shrink-0 accent-(--ink)" />
            Send me order updates on this number on WhatsApp
          </label>
          <Field id="co-name" label="Name" error={err("name")}>
            <input id="co-name" name="name" autoComplete="name" required defaultValue={saved?.name} className={field} {...described("name")} />
          </Field>
          <Field id="co-email" label="Email (optional)" error={err("email")}>
            <input id="co-email" name="email" type="email" autoComplete="email" defaultValue={saved?.email} className={field} {...described("email")} />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-4 text-lg font-semibold">Delivery</legend>
          <Choice
            name="delivery"
            value="ship"
            checked={mode === "ship"}
            onChange={() => {
              setDelivery("ship")
            }}
            disabled={shipBlocked}
            icon={<Truck aria-hidden className="size-5" strokeWidth={1.75} />}
            title={courier ? scope : "Delivery"}
            detail={pickupOnly.length ? `${pickupOnly.map((p) => p.tile.code ?? p.tile.name).join(", ")} can only be picked up.` : !courier ? "Not available right now." : shipFee === null ? "Delivery charge confirmed on WhatsApp before you pay." : shipFee === 0 ? "Free delivery. Pay by UPI once we confirm." : `${formatPaise(shipFee)} delivery. Pay by UPI once we confirm.`}
          />
          <Choice
            name="delivery"
            value="pickup"
            checked={mode === "pickup"}
            onChange={() => {
              setDelivery("pickup")
            }}
            icon={<Store aria-hidden className="size-5" strokeWidth={1.75} />}
            title="Pick up at the shop"
            detail="Free. Gulab Auto Garage, near Milap Theatre, S.V. Road, Malad West. Open 9 am to 10 pm."
          />
          {mode === "ship" ? (
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="co-line1" label="Flat or house, building" error={err("line1")}>
                  <input id="co-line1" name="line1" autoComplete="address-line1" defaultValue={saved?.line1} className={field} {...described("line1")} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="co-line2" label="Area and street">
                  <input id="co-line2" name="line2" autoComplete="address-line2" defaultValue={saved?.line2} className={field} />
                </Field>
              </div>
              <Field id="co-landmark" label="Landmark (optional)">
                <input id="co-landmark" name="landmark" defaultValue={saved?.landmark} className={field} />
              </Field>
              <Field id="co-pincode" label="Pincode" error={err("pincode")}>
                <input id="co-pincode" name="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} defaultValue={saved?.pincode} className={field} {...described("pincode")} />
              </Field>
              <Field id="co-city" label="City" error={err("city")}>
                <input id="co-city" name="city" autoComplete="address-level2" defaultValue={saved?.city} className={field} {...described("city")} />
              </Field>
              <Field id="co-state" label="State">
                <input id="co-state" value="Maharashtra" readOnly className={`${field} text-muted`} />
              </Field>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-3" aria-describedby={err("payment") ? "co-payment-error" : undefined}>
          <legend className="mb-4 text-lg font-semibold">Payment</legend>
          {mode === "ship" ? (
            <p className="rounded-control border border-line-strong p-4 text-sm">
              <span className="block font-semibold">UPI after we confirm</span>
              <span className="text-muted">We check stock and send the total with the delivery charge and our UPI details on WhatsApp. Pay then.</span>
            </p>
          ) : (
            <>
              <Choice
                name="payment"
                value="pay_at_store"
                checked={method === "pay_at_store"}
                onChange={() => {
                  setPayment("pay_at_store")
                }}
                icon={<Store aria-hidden className="size-5" strokeWidth={1.75} />}
                title="Pay at the shop"
                detail="Cash or UPI when you pick up."
              />
              <Choice
                name="payment"
                value="upi_manual"
                checked={method === "upi_manual"}
                onChange={() => {
                  setPayment("upi_manual")
                }}
                icon={<span className="block w-5 text-center text-xs font-bold">UPI</span>}
                title="UPI after we confirm"
                detail="We send our UPI details on WhatsApp once the parts are checked."
              />
            </>
          )}
          {err("payment") ? <p id="co-payment-error" className="text-sm text-danger">{err("payment")}</p> : null}
        </fieldset>

        <Field id="co-note" label="Note for the shop (optional)">
          <textarea id="co-note" name="note" rows={2} maxLength={500} className={`${field} h-auto py-2.5`} placeholder="Vehicle model, best time to call" />
        </Field>
      </div>

      <aside className="flex flex-col gap-4 rounded-container border border-line bg-surface p-4 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
        <h2 className="text-lg">Order summary</h2>
        {dropped.length ? (
          <p role="status" className="rounded-control border border-line-strong p-3 text-sm">
            Not in this order: {dropped.join(", ")}. {dropped.length === 1 ? "It is" : "They are"} no longer available at the quantity in your cart.{" "}
            <Link href="/cart" className="font-semibold">
              Check your cart
            </Link>
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {priced.map(({ line, tile, unitPaise }) => (
            <SummaryLine key={line.id} tile={tile} qty={line.qty} unitPaise={unitPaise} />
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Items</dt>
            <dd>{formatPaise(itemsPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd>{mode === "pickup" ? "Free pickup" : fee === null ? "Confirmed on WhatsApp" : fee === 0 ? "Free" : formatPaise(fee)}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-semibold">Total</dt>
            <dd>
              <NumberFlow value={totalPaise / 100} locales="en-IN" format={rupees} className="text-xl font-semibold" />
              {fee === null ? <span className="text-sm text-muted"> + delivery</span> : null}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted">Prices include all taxes. We confirm on WhatsApp or by phone, 9 am to 10 pm.</p>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="remember" defaultChecked={saved !== null} className="mt-0.5 size-5 shrink-0 accent-(--ink)" />
          Remember my details on this phone
        </label>
        {notice ? (
          <p role="alert" className="rounded-control border border-danger/60 p-3 text-sm">
            {notice}
          </p>
        ) : null}
        {belowMinimum ? <p className="text-sm text-danger">The minimum order is {formatPaise(minOrderPaise)}. Add {formatPaise(minOrderPaise - itemsPaise)} more.</p> : null}
        <button type="submit" disabled={pending || belowMinimum || priced.length === 0} className={`${button.big} w-full`}>
          {pending ? <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2} /> : null}
          {pending ? "Placing order" : `Place order, ${formatPaise(totalPaise)}`}
        </button>
        <p className="text-xs text-muted">
          By placing this order you agree to our{" "}
          <Link href="/pages/terms" className="text-ink">
            terms
          </Link>{" "}
          and confirm you are 18 or older.
        </p>
      </aside>
    </form>
  )
}

function SummaryLine({ tile, qty, unitPaise }: { tile: Tile; qty: number; unitPaise: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-control border border-line bg-well">
        {tile.image ? <ProductImage image={tile.image} alt="" sizes="48px" /> : <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="row" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-sm">
        <span className="line-clamp-1 font-medium">{tile.name}</span>
        <span className="text-muted">
          {qty} {unitWord(tile.unit, qty)} x {formatPaise(unitPaise)}
        </span>
      </span>
      <span className="text-sm font-semibold">{formatPaise(unitPaise * qty)}</span>
    </li>
  )
}
