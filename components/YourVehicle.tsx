"use client"

import { Check } from "lucide-react"
import Link from "next/link"
import { useStored } from "@/lib/use-stored"

export default function YourVehicle({ options }: { options: { key: string; label: string; href: string }[] }) {
  const key = useStored("ws-vehicle")
  const mine = options.find((o) => o.key === key)
  if (!mine) return null
  return (
    <li className="snap-start">
      <Link href={mine.href as `/v/${string}`} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-ink bg-ink px-4 font-medium whitespace-nowrap text-bg no-underline">
        <Check aria-hidden className="size-4" strokeWidth={2.25} />
        Your {mine.label}
      </Link>
    </li>
  )
}
