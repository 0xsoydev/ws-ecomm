"use client"

import { Search, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { useCart } from "@/lib/cart"
import { button } from "@/lib/ui"
import { waLink } from "@/lib/whatsapp"
import BrowsePanel, { type BrowseSystem } from "./BrowsePanel"
import Logo from "./Logo"
import WhatsAppIcon from "./WhatsAppIcon"

function SearchField({ shortcut }: { shortcut: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!shortcut) return
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement?.matches("input, textarea, [contenteditable]") === true
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
    }
  }, [shortcut])
  return (
    <form action="/search" role="search" className="relative w-full">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" strokeWidth={1.75} />
      <input
        ref={ref}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Search parts by code, name or vehicle"
        placeholder="Search parts, codes or vehicles"
        className="h-11 w-full rounded-control border border-line-strong bg-surface pr-3 pl-11 text-base placeholder:text-muted focus-visible:border-ink [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  )
}

function CartLink({ className }: { className: string }) {
  const count = useCart().length
  return (
    <Link href="/cart" className={`${className} relative`} aria-label={count ? `Cart, ${String(count)} items` : "Cart"}>
      <ShoppingBag aria-hidden className="size-5.5" strokeWidth={1.75} />
      <span className="hidden lg:inline">Cart</span>
      {count ? (
        <span className="absolute top-1 right-0.5 min-w-4.5 rounded-full border border-ink bg-accent px-1 text-center text-[11px] leading-4 font-semibold text-on-accent lg:static lg:min-w-5 lg:text-xs lg:leading-5">{count}</span>
      ) : null}
    </Link>
  )
}

const desktopLink = "flex h-11 items-center px-3 text-sm font-medium whitespace-nowrap text-muted no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink"

export default function StoreHeader({ systems }: { systems: BrowseSystem[] }) {
  const ask = waLink("Hi, I have a question about a part.")
  return (
    <>
      <div className="flex h-14 items-center gap-1 pr-2 pl-4 lg:hidden">
        <Link href="/" aria-label="WS Green home" className="flex h-11 items-center">
          <Logo className="h-4 w-auto" />
        </Link>
        <a href={ask} target="_blank" rel="noopener" aria-label="Ask on WhatsApp" className={`${button.icon} ml-auto`}>
          <WhatsAppIcon className="size-5.5" />
        </a>
        <CartLink className={button.icon} />
      </div>

      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="px-4 pb-2.5 lg:hidden">
          <SearchField shortcut={false} />
        </div>
        <div className="mx-auto hidden h-16 max-w-[1200px] items-center gap-6 px-6 lg:flex">
          <Link href="/" aria-label="WS Green home" className="flex h-11 shrink-0 items-center">
            <Logo className="h-5 w-auto" />
          </Link>
          <BrowsePanel systems={systems} triggerClassName={`${button.secondary} shrink-0`} />
          <div className="max-w-[640px] flex-1">
            <SearchField shortcut />
          </div>
          <a href={ask} target="_blank" rel="noopener" className="ml-auto flex h-11 shrink-0 items-center gap-2 font-medium no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-muted">
            <WhatsAppIcon className="size-5" />
            WhatsApp
          </a>
          <CartLink className="flex h-11 shrink-0 items-center gap-2 font-medium no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-muted" />
        </div>
      </header>

      <nav aria-label="Categories" className="hidden border-b border-line lg:block">
        <ul className="mx-auto flex max-w-[1200px] items-center px-3">
          {systems.map((s) => (
            <li key={s.slug}>
              <Link href={`/c/${s.slug}`} className={desktopLink}>
                {s.shortName}
              </Link>
            </li>
          ))}
          <li className="ml-auto">
            <Link href="/v" className={desktopLink}>
              Shop by vehicle
            </Link>
          </li>
          <li>
            <Link href="/wholesale" className={desktopLink}>
              Wholesale
            </Link>
          </li>
          <li>
            <Link href="/prices" className={desktopLink}>
              Price list
            </Link>
          </li>
        </ul>
      </nav>
    </>
  )
}
