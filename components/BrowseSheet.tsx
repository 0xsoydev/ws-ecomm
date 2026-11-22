"use client"

import { ChevronRight, ListOrdered, Scooter, Store, Warehouse } from "lucide-react"
import Link from "next/link"
import type { BrowseSystem } from "./BrowsePanel"
import Sheet from "./Sheet"
import SystemIcon from "./SystemIcon"

const more = [
  { href: "/v", label: "Shop by vehicle", icon: Scooter },
  { href: "/wholesale", label: "Wholesale prices", icon: Warehouse },
  { href: "/prices", label: "Price list", icon: ListOrdered },
  { href: "/store", label: "Visit the shop", icon: Store },
] as const

export default function BrowseSheet({ systems, open, onOpenChange }: { systems: BrowseSystem[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const close = () => { onOpenChange(false); }
  const row = "flex min-h-12 items-center gap-3 rounded-control px-2 no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-bg active:bg-bg"
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Categories">
      <ul className="grid grid-cols-2 gap-2">
        {systems.map((s) => {
          return (
            <li key={s.slug}>
              <Link href={`/c/${s.slug}`} onClick={close} className="flex min-h-16 flex-col justify-center gap-0.5 rounded-control border border-line px-3 py-2.5 no-underline transition-colors duration-150 ease-out active:bg-bg [@media(hover:hover)]:hover:bg-bg">
                <SystemIcon slug={s.slug} className="size-5 text-muted" strokeWidth={1.5} />
                <span className="leading-tight font-semibold">{s.shortName}</span>
                <span className="text-xs text-muted">{s.count} parts</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <ul className="mt-4 flex flex-col">
        {more.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} onClick={close} className={row}>
              <Icon aria-hidden className="size-5 text-muted" strokeWidth={1.5} />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
