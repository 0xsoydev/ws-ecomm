import { BatteryCharging, CircuitBoard, Disc3, Gauge, KeyRound, Lightbulb, PlugZap, Scooter, Wrench } from "lucide-react"
import { createElement } from "react"

const ICONS = {
  "batteries-bms": BatteryCharging,
  electricals: CircuitBoard,
  "connectors-charging": PlugZap,
  lighting: Lightbulb,
  dashboard: Gauge,
  "brakes-suspension": Disc3,
  "body-frame": Scooter,
  "locks-hardware": KeyRound,
} as const

export default function SystemIcon({ slug, className, strokeWidth = 1.5 }: { slug: string; className: string; strokeWidth?: number }) {
  return createElement(slug in ICONS ? ICONS[slug as keyof typeof ICONS] : Wrench, { "aria-hidden": true, className, strokeWidth })
}
