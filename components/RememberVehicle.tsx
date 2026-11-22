"use client"

import { Check } from "lucide-react"
import { button } from "@/lib/ui"
import { useStored, writeStored } from "@/lib/use-stored"

export default function RememberVehicle({ vehicleKey, label }: { vehicleKey: string; label: string }) {
  const saved = useStored("ws-vehicle") === vehicleKey
  return (
    <button type="button" aria-pressed={saved} onClick={() => { writeStored("ws-vehicle", saved ? null : vehicleKey); }} className={`${button.small} h-11 self-start`}>
      {saved ? <Check aria-hidden className="size-4" strokeWidth={2.25} /> : null}
      {saved ? `Remembered: ${label}` : "Remember my vehicle"}
    </button>
  )
}
