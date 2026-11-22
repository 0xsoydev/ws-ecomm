"use client"

import { Search, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { useCart } from "@/lib/cart"
import { priceCopy } from "@/lib/pricing"
import { searchProducts } from "@/lib/search"
import { useSnapshot } from "@/lib/snapshot"
import { button } from "@/lib/ui"
import { waLink } from "@/lib/whatsapp"
import type { BrowseSystem } from "./BrowseSheet"
import Logo from "./Logo"
import ProductImage from "./ProductImage"
import WhatsAppIcon from "./WhatsAppIcon"

function SearchField({ shortcut }: { shortcut: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const id = useId()
  const router = useRouter()
  const [q, setQ] = useState("")
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const [wanted, setWanted] = useState(false)
  const { data } = useSnapshot(wanted)
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
  const results = data && q.trim().length >= 2 ? searchProducts(data.tiles, q, 6) : []
  const open = focused && q.trim().length >= 2 && data !== null
  const go = (slug: string) => {
    setFocused(false)
    ref.current?.blur()
    router.push(`/p/${slug}`)
  }
  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(-1, a - 1))
    } else if (e.key === "Escape") {
      setFocused(false)
    } else if (e.key === "Enter" && active >= 0) {
      const hit = results[active]
      if (hit) {
        e.preventDefault()
        go(hit.slug)
      }
    }
  }
  return (
    <form action="/search" role="search" className="relative w-full">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" strokeWidth={1.75} />
      <input
        ref={ref}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${String(active)}` : undefined}
        aria-label="Search parts by code, name or vehicle"
        placeholder="Search parts, codes or vehicles"
        value={q}
        onChange={(e) => {
          setQ(e.currentTarget.value)
          setActive(-1)
        }}
        onPointerDown={() => {
          setWanted(true)
        }}
        onFocus={() => {
          setWanted(true)
          setFocused(true)
        }}
        onBlur={() => {
          setTimeout(() => {
            setFocused(false)
          }, 150)
        }}
        onKeyDown={onKey}
        className="h-11 w-full rounded-control border border-line-strong bg-surface pr-3 pl-11 text-base placeholder:text-muted focus-visible:border-ink [&::-webkit-search-cancel-button]:hidden"
      />
      {open ? (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-container border border-line bg-surface shadow-[0_16px_40px_-20px_rgb(21_25_22/0.45)]">
          <ul id={`${id}-list`} role="listbox" aria-label="Suggestions" className="max-h-[60dvh] overflow-y-auto py-1">
            {results.map((t, i) => (
              <li key={t.id} id={`${id}-${String(i)}`} role="option" aria-selected={i === active}>
                <Link
                  href={`/p/${t.slug}`}
                  onClick={() => {
                    setFocused(false)
                  }}
                  className={`flex items-center gap-3 px-3 py-2 no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-bg ${i === active ? "bg-bg" : ""}`}
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-[6px] border border-line bg-well">
                    {t.image ? <ProductImage image={t.image} alt="" sizes="40px" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-muted">{priceCopy(t.priced, t.unit).main}</span>
                  </span>
                </Link>
              </li>
            ))}
            {results.length === 0 ? <li className="px-3 py-3 text-sm text-muted">No part matches. Press Enter to search everything, or send us a photo on WhatsApp.</li> : null}
          </ul>
          <button type="submit" className="flex h-11 w-full items-center gap-2 border-t border-line px-3 text-left text-sm font-medium transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-bg">
            <Search aria-hidden className="size-4" strokeWidth={2} />
            See all results for &lsquo;{q.trim()}&rsquo;
          </button>
        </div>
      ) : null}
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
          <div className="max-w-[680px] flex-1">
            <SearchField shortcut />
          </div>
          <Link href="/v" className="ml-auto flex h-11 shrink-0 items-center font-medium no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-muted">
            Shop by vehicle
          </Link>
          <a href={ask} target="_blank" rel="noopener" className="flex h-11 shrink-0 items-center gap-2 font-medium no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-muted">
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
