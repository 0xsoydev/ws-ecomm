import type { PriceCopy } from "@/lib/pricing"

export default function PriceLines({ copy, size = "sm" }: { copy: PriceCopy; size?: "sm" | "lg" }) {
  return (
    <p className="flex flex-col">
      <span className={size === "lg" ? "text-xl font-semibold" : "font-semibold"}>{copy.main}</span>
      {copy.sub ? <span className={size === "lg" ? "text-muted" : "text-xs text-muted"}>{copy.sub}</span> : null}
    </p>
  )
}
