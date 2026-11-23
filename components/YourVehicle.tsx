"use client"

import { Check } from "lucide-react"
import Link from "next/link"
import { useStored } from "@/lib/use-stored"
import type { VehicleOption } from "./ListingClient"

export default function YourVehicle({ options }: { options: VehicleOption[] }) {
  const key = useStored("ws-vehicle")
  const mine = options.find((o) => o.key === key)
  if (!mine) return null
  return (
    <Link href={mine.href as `/v/${string}`} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-ink bg-ink px-4 text-sm font-medium whitespace-nowrap text-bg no-underline">
      <Check aria-hidden className="size-4" strokeWidth={2.25} />
      Your {mine.label}
    </Link>
  )
}
