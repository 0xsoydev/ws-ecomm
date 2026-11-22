"use client"

import { Popover } from "@base-ui/react/popover"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import SystemIcon from "./SystemIcon"

export type BrowseSystem = { slug: string; name: string; shortName: string; count: number; categories: { slug: string; name: string; count: number }[] }

export default function BrowsePanel({ systems, triggerClassName }: { systems: BrowseSystem[]; triggerClassName: string }) {
  const [open, setOpen] = useState(false)
  const close = () => { setOpen(false); }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={`${triggerClassName} gap-1.5 data-popup-open:bg-surface`}>
        Browse
        <ChevronDown aria-hidden className="size-4 transition-transform duration-200 ease-out [[data-popup-open]_&]:rotate-180" strokeWidth={1.75} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={0} align="start" className="z-40">
          <Popover.Popup className="w-[min(1200px,calc(100vw-32px))] origin-(--transform-origin) rounded-b-container border border-line bg-surface p-6 shadow-[0_16px_40px_-20px_rgb(21_25_22/0.35)] outline-none transition-[opacity,transform] duration-200 ease-out data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0">
            <Popover.Title className="sr-only">Browse parts</Popover.Title>
            <div className="grid grid-cols-4 gap-x-8 gap-y-8">
              {systems.map((s) => {
                return (
                  <div key={s.slug} className="flex flex-col gap-2">
                    <Link href={`/c/${s.slug}`} onClick={close} className="group flex items-center gap-2 font-semibold no-underline">
                      <SystemIcon slug={s.slug} className="size-5 text-muted" strokeWidth={1.5} />
                      <span className="[@media(hover:hover)]:group-hover:underline">{s.name}</span>
                    </Link>
                    <ul className="flex flex-col">
                      {s.categories.slice(0, 8).map((c) => (
                        <li key={c.slug}>
                          <Link href={`/c/${s.slug}/${c.slug}`} onClick={close} className="flex justify-between gap-3 py-1 text-sm text-muted no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink">
                            <span>{c.name}</span>
                            <span>{c.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
