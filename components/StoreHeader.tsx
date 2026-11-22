"use client"

import { Phone, Search, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useCart } from "@/lib/cart"
import { storeStatus, type Hours, type SpecialDay, type StoreStatus } from "@/lib/time"
import { button } from "@/lib/ui"
import { telLink, waLink } from "@/lib/whatsapp"
import BrowsePanel, { type BrowseSystem } from "./BrowsePanel"
import Logo from "./Logo"
import WhatsAppIcon from "./WhatsAppIcon"

function useStatus(weekly: readonly Hours[], special: readonly SpecialDay[]) {
  const [status, setStatus] = useState<StoreStatus | null>(null)
  useEffect(() => {
    const tick = () => { setStatus(storeStatus(new Date(), weekly, special)); }
    tick()
    const timer = setInterval(tick, 60000)
    return () => { clearInterval(timer); }
  }, [weekly, special])
  return status
}

function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)
  const last = useRef(0)
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - last.current
        if (Math.abs(delta) < 8) return
        const busy = document.documentElement.hasAttribute("data-base-ui-scroll-locked") || document.activeElement?.matches("input, textarea") === true
        setHidden(!busy && delta > 0 && y > 64)
        last.current = y
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])
  return hidden
}

function SearchField({ className, autoFocusKey }: { className: string; autoFocusKey: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!autoFocusKey) return
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.matches("input, textarea, [contenteditable]") === true
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("keydown", onKey); }
  }, [autoFocusKey])
  return (
    <form action="/search" role="search" className={`header-search relative ${className}`}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" strokeWidth={1.75} />
      <input
        ref={ref}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Search parts by code, name or vehicle"
        placeholder="Search parts"
        className="h-11 w-full rounded-control border border-line-strong bg-surface pr-3 pl-9.5 text-base placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  )
}

const segment = "flex h-16 items-center px-5 font-medium no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-surface"

export default function StoreHeader({ weekly, special, scope, systems }: { weekly: Hours[]; special: SpecialDay[]; scope: string; systems: BrowseSystem[] }) {
  const status = useStatus(weekly, special)
  const hidden = useHideOnScroll()
  const count = useCart().length
  const tone = status?.tone === "closing" ? "text-signal" : status?.tone === "open" ? "text-ink" : "text-muted"
  return (
    <header data-hidden={hidden} className="sticky top-0 z-30 flex flex-col border-b border-line bg-bg transition-transform duration-200 ease-out data-[hidden=true]:-translate-y-full lg:data-[hidden=true]:translate-y-0">
      <div className="flex h-14 items-center gap-1 pr-2 pl-4 lg:hidden">
        <Link href="/" aria-label="WS Green home" className="flex h-11 shrink-0 items-center pr-2">
          <Logo className="h-4 w-auto" />
        </Link>
        <SearchField className="min-w-0 flex-1 transition-opacity duration-150 ease-out" autoFocusKey={false} />
        <a href={waLink("Hi, I have a question about a part.")} target="_blank" rel="noopener" aria-label="Ask on WhatsApp" className={button.icon}>
          <WhatsAppIcon className="size-5" />
        </a>
        <a href={telLink} aria-label="Call the shop" className={button.icon}>
          <Phone aria-hidden className="size-5" strokeWidth={1.75} />
        </a>
      </div>
      <p className="flex h-7 items-center truncate px-4 text-xs lg:order-last lg:mx-auto lg:h-8 lg:w-full lg:max-w-[1200px] lg:px-5 lg:text-sm" aria-live="off">
        {status ? <span className={`font-medium ${tone}`}>{status.text}.</span> : null}
        {status ? <span data-scope className="text-muted">&nbsp;{scope}.</span> : null}
      </p>

      <div className="hidden border-b border-line lg:block">
      <div className="mx-auto flex max-w-[1200px] items-stretch divide-x divide-line border-x border-line">
        <Link href="/" aria-label="WS Green home" className={`${segment} shrink-0`}>
          <Logo className="h-4.5 w-auto" />
        </Link>
        <BrowsePanel systems={systems} triggerClassName={segment} />
        <Link href="/v" className={segment}>
          Vehicles
        </Link>
        <Link href="/wholesale" className={segment}>
          Wholesale
        </Link>
        <Link href="/service" className={segment}>
          Workshop
        </Link>
        <div className="flex min-w-60 flex-1 items-center px-4">
          <SearchField className="w-full max-w-[480px] transition-opacity duration-150 ease-out" autoFocusKey />
        </div>
        <a href={waLink("Hi, I have a question about a part.")} target="_blank" rel="noopener" className={`${segment} gap-2`}>
          <WhatsAppIcon className="size-4.5" />
          WhatsApp
        </a>
        <Link href="/cart" className={`${segment} relative gap-2`} aria-label={count ? `Cart, ${String(count)} items` : "Cart"}>
          <ShoppingBag aria-hidden className="size-5" strokeWidth={1.75} />
          Cart
          {count ? <span className="min-w-5 rounded-full border border-ink bg-accent px-1.5 text-center text-xs leading-5 font-semibold text-on-accent">{count}</span> : null}
        </Link>
      </div>
      </div>
    </header>
  )
}
