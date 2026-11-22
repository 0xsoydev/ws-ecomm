"use client"

import { Plus, Trash } from "lucide-react"
import { useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"
import { formatPaise, parseRupees } from "@/lib/format"
import { button, field } from "@/lib/ui"
import { saveSettings, type SettingsInput } from "./actions"

type Band = { upTo: string; fee: string }

const toRupees = (paise: number | null) => (paise === null ? "" : String(paise / 100))

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-container border border-line bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      {children}
    </section>
  )
}

export default function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [courier, setCourier] = useState(initial.courierAvailable)
  const [bands, setBands] = useState<Band[]>(initial.shippingBands.map((b) => ({ upTo: toRupees(b.upToPaise), fee: toRupees(b.feePaise) })))
  const [free, setFree] = useState(toRupees(initial.freeShippingFromPaise ?? null))
  const [minimum, setMinimum] = useState(toRupees(initial.minOrderPaise))
  const [upi, setUpi] = useState(initial.upiVpa)
  const [merchant, setMerchant] = useState(initial.upiVpaIsMerchant)
  const [review, setReview] = useState(initial.reviewLink)

  const save = () => {
    setError(null)
    const parsedBands = bands.filter((b) => b.upTo.trim() !== "" || b.fee.trim() !== "").map((b) => ({ upToPaise: parseRupees(b.upTo), feePaise: parseRupees(b.fee) }))
    if (parsedBands.some((b) => b.upToPaise === null || b.feePaise === null)) {
      setError("Each delivery band needs an order value and a charge, in rupees.")
      return
    }
    const minPaise = parseRupees(minimum === "" ? "0" : minimum)
    const freePaise = free.trim() === "" ? null : parseRupees(free)
    if (minPaise === null || (free.trim() !== "" && freePaise === null)) {
      setError("Enter amounts in rupees, for example 200.")
      return
    }
    start(async () => {
      const r = await saveSettings({
        courierAvailable: courier,
        shippingBands: parsedBands.map((b) => ({ upToPaise: b.upToPaise ?? 0, feePaise: b.feePaise ?? 0 })),
        freeShippingFromPaise: freePaise,
        minOrderPaise: minPaise,
        upiVpa: upi.trim(),
        upiVpaIsMerchant: merchant,
        reviewLink: review.trim(),
      })
      if (r.ok) toast("Settings saved")
      else setError(r.message)
    })
  }

  const sorted = bands
    .map((b) => ({ upTo: parseRupees(b.upTo), fee: parseRupees(b.fee) }))
    .filter((b): b is { upTo: number; fee: number } => b.upTo !== null && b.fee !== null)
    .sort((a, b) => a.upTo - b.upTo)

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Section title="Courier delivery" hint="When off, customers can only pick up at the shop.">
        <label className="flex min-h-11 items-center justify-between gap-3 font-medium">
          Deliver by courier within Maharashtra
          <input
            type="checkbox"
            checked={courier}
            onChange={(e) => {
              setCourier(e.currentTarget.checked)
            }}
            className="size-5 accent-(--ink)"
          />
        </label>
      </Section>

      <Section title="Delivery charges" hint="Charge by order value. Orders above the last band get the charge confirmed on WhatsApp.">
        <ul className="flex flex-col gap-2">
          {bands.map((b, i) => (
            <li key={i} className="grid grid-cols-[1fr_1fr_44px] items-end gap-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Orders up to (₹)
                <input
                  inputMode="decimal"
                  value={b.upTo}
                  onChange={(e) => {
                    const v = e.currentTarget.value
                    setBands((all) => all.map((x, j) => (j === i ? { ...x, upTo: v } : x)))
                  }}
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Charge (₹)
                <input
                  inputMode="decimal"
                  value={b.fee}
                  onChange={(e) => {
                    const v = e.currentTarget.value
                    setBands((all) => all.map((x, j) => (j === i ? { ...x, fee: v } : x)))
                  }}
                  className={field}
                />
              </label>
              <button
                type="button"
                aria-label="Remove band"
                onClick={() => {
                  setBands((all) => all.filter((_, j) => j !== i))
                }}
                className={button.icon}
              >
                <Trash aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
        {bands.length < 6 ? (
          <button
            type="button"
            onClick={() => {
              setBands((all) => [...all, { upTo: "", fee: "" }])
            }}
            className={`${button.small} self-start`}
          >
            <Plus aria-hidden className="size-4" strokeWidth={2} />
            Add a band
          </button>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Free delivery from (₹, leave empty for never)
          <input
            inputMode="decimal"
            value={free}
            onChange={(e) => {
              setFree(e.currentTarget.value)
            }}
            className={field}
          />
        </label>
        {sorted.length ? (
          <p className="text-sm text-muted">
            Customers see:{" "}
            {sorted.map((b, i) => `${i === 0 ? "up to" : `then up to`} ${formatPaise(b.upTo)}, ${formatPaise(b.fee)}`).join("; ")}
            {free && parseRupees(free) !== null ? `; free from ${formatPaise(parseRupees(free) ?? 0)}` : ""}.
          </p>
        ) : null}
      </Section>

      <Section title="Minimum order" hint="Orders below this value cannot be placed online.">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Minimum order (₹)
          <input
            inputMode="decimal"
            value={minimum}
            onChange={(e) => {
              setMinimum(e.currentTarget.value)
            }}
            className={field}
          />
        </label>
      </Section>

      <Section title="UPI payments" hint="Sent in the confirmation message so customers can pay. Use a merchant (business) UPI ID.">
        <label className="flex flex-col gap-1 text-sm font-medium">
          UPI ID
          <input
            value={upi}
            onChange={(e) => {
              setUpi(e.currentTarget.value)
            }}
            placeholder="gulabauto@okaxis"
            autoCapitalize="off"
            className={field}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={merchant}
            onChange={(e) => {
              setMerchant(e.currentTarget.checked)
            }}
            className="size-5 accent-(--ink)"
          />
          This is a merchant UPI ID from the bank or a business QR app
        </label>
      </Section>

      <Section title="Google reviews" hint="Shown next to the shop name on the site so customers can read your reviews.">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Link to your Google reviews
          <input
            type="url"
            value={review}
            onChange={(e) => {
              setReview(e.currentTarget.value)
            }}
            placeholder="https://g.page/r/..."
            className={field}
          />
        </label>
      </Section>

      {error ? (
        <p role="alert" className="rounded-control border border-danger/60 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0">
        <button type="button" onClick={save} disabled={pending} className={`${button.primary} w-full md:w-auto`}>
          {pending ? "Saving" : "Save settings"}
        </button>
      </div>
    </div>
  )
}
