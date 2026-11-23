"use client"

import NumberFlow from "@number-flow/react"
import { ChevronRight, House, LayoutGrid, Scooter, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useCart } from "@/lib/cart"
import { unitPrice } from "@/lib/pricing"
import { loadSnapshot, useSnapshot } from "@/lib/snapshot"
import dynamic from "next/dynamic"
import type { BrowseSystem } from "./BrowseSheet"

const BrowseSheet = dynamic(() => import("./BrowseSheet"), { ssr: false })

const OWN_BOTTOM = ["/p/", "/cart", "/checkout"]

function CartBar() {
  const lines = useCart()
  const { data } = useSnapshot(lines.length > 0)
  const [added, setAdded] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onAdd = (e: Event) => {
      const id = (e as CustomEvent<number>).detail
      loadSnapshot().then(
        (d) => {
          const tile = d.tiles.find((t) => t.id === id)
          setAdded(tile ? tile.name : "part")
          clearTimeout(timer)
          timer = setTimeout(() => {
            setAdded(null)
          }, 1600)
        },
        () => undefined,
      )
    }
    window.addEventListener("cart:add", onAdd)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("cart:add", onAdd)
    }
  }, [])

  if (lines.length === 0) return null
  const byId = new Map(data?.tiles.map((t) => [t.id, t]))
  let total = 0
  for (const line of lines) {
    const tile = byId.get(line.id)
    if (!tile) continue
    try {
      total += unitPrice(tile.priced, line.qty).paise * line.qty
    } catch {
      continue
    }
  }
  const items = `${String(lines.length)} ${lines.length === 1 ? "item" : "items"}`

  return (
    <aside
      aria-label="Cart"
      data-bar="cart"
      className="fixed inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 overflow-hidden rounded-container border border-line-strong bg-surface shadow-[0_10px_30px_-14px_rgb(21_25_22/0.45)] lg:hidden"
    >
      <Link href="/cart" className="flex flex-col px-4 no-underline">
        {added ? (
          <span key={added} className="animate-rise truncate border-b border-line pt-2.5 pb-2 text-sm">
            Added <span className="font-semibold">{added}</span>
          </span>
        ) : null}
        <span className="flex h-13 items-center gap-3">
          <span className="text-sm text-muted">{items}</span>
          {data ? (
            <NumberFlow value={total / 100} locales="en-IN" format={{ style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 }} className="font-semibold" />
          ) : null}
          <span className="ml-auto flex items-center gap-1 font-semibold">
            View cart
            <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
          </span>
        </span>
      </Link>
      <span aria-live="polite" className="sr-only">
        {added ? `${added} added. ${items} in cart` : ""}
      </span>
    </aside>
  )
}

export function BottomBarView({ pathname, systems }: { pathname: string | null; systems: BrowseSystem[] }) {
  const [browsing, setBrowsing] = useState(false)
  const [opened, setOpened] = useState(false)
  const count = useCart().length
  if (pathname && OWN_BOTTOM.some((p) => pathname.startsWith(p))) return null
  const tab = "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs no-underline transition-colors duration-150 ease-out"
  const state = (active: boolean) => (active ? "font-semibold text-ink shadow-[inset_0_2px_0_var(--ink)]" : "text-muted [@media(hover:hover)]:hover:text-ink")
  return (
    <>
      <CartBar />
      <nav data-bar="tab" aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="flex">
          <li className="flex flex-1">
            <Link href="/" className={`${tab} ${state(pathname === "/")}`} aria-current={pathname === "/" ? "page" : undefined}>
              <House aria-hidden className="size-5.5" strokeWidth={1.5} />
              Home
            </Link>
          </li>
          <li className="flex flex-1">
            <button type="button" onClick={() => {
                setOpened(true)
                setBrowsing(true)
              }} className={`${tab} ${state(pathname?.startsWith("/c/") === true || browsing)}`} aria-haspopup="dialog">
              <LayoutGrid aria-hidden className="size-5.5" strokeWidth={1.5} />
              Categories
            </button>
          </li>
          <li className="flex flex-1">
            <Link href="/v" className={`${tab} ${state(pathname?.startsWith("/v") === true)}`} aria-current={pathname?.startsWith("/v") ? "page" : undefined}>
              <Scooter aria-hidden className="size-5.5" strokeWidth={1.5} />
              Vehicles
            </Link>
          </li>
          <li className="flex flex-1">
            <Link href="/cart" className={`${tab} ${state(false)} relative`}>
              <span className="relative">
                <ShoppingBag aria-hidden className="size-5.5" strokeWidth={1.5} />
                {count ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4.5 rounded-full border border-ink bg-accent px-1 text-center text-[11px] leading-4 font-semibold text-on-accent">
                    <NumberFlow value={count} />
                    <span className="sr-only"> {count === 1 ? "item in" : "items in"}</span>
                  </span>
                ) : null}
              </span>
              Cart
            </Link>
          </li>
        </ul>
      </nav>
      {opened ? <BrowseSheet systems={systems} open={browsing} onOpenChange={setBrowsing} /> : null}
    </>
  )
}

export default function BottomBar({ systems }: { systems: BrowseSystem[] }) {
  return <BottomBarView pathname={usePathname()} systems={systems} />
}
