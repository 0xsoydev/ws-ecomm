import type { Metadata } from "next"
import { Suspense } from "react"
import { requireRole } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import SettingsForm from "./settings-form"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <h1 className="text-2xl">Shop settings</h1>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-container bg-surface" />}>
        <Form />
      </Suspense>
    </div>
  )
}

async function Form() {
  await requireRole("owner")
  const s = await getSettings()
  return (
    <SettingsForm
      initial={{
        courierAvailable: s.courierAvailable,
        shippingBands: s.shippingBands,
        freeShippingFromPaise: s.freeShippingFromPaise,
        minOrderPaise: s.minOrderPaise,
        upiVpa: s.upiVpa ?? "",
        upiVpaIsMerchant: s.upiVpaIsMerchant,
        reviewLink: s.reviewLink ?? "",
      }}
    />
  )
}
