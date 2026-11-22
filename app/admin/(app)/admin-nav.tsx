"use client"

import { Camera, House, IndianRupee, ListChecks, Package, ReceiptText, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { href: "/admin", label: "Home", icon: House },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/products/pricing", label: "Prices", icon: IndianRupee },
  { href: "/admin/photos", label: "Photos", icon: Camera },
  { href: "/admin/products/fix", label: "Fix", icon: ListChecks },
] as const

const desktopOnly = [{ href: "/admin/settings", label: "Settings", icon: Settings }] as const

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false
  if (href === "/admin" || href === "/admin/products") return pathname === href || (href === "/admin/products" && /^\/admin\/products\/\d+/.test(pathname))
  return pathname.startsWith(href)
}

export function AdminNav() {
  return <AdminNavView pathname={usePathname()} />
}

export function AdminNavView({ pathname }: { pathname: string | null }) {
  return (
    <>
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-6">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-14 flex-col items-center justify-center gap-0.5 text-xs no-underline transition-colors duration-200 ease-out ${active ? "font-semibold text-ink" : "text-muted"}`}
                >
                  <Icon aria-hidden size={20} strokeWidth={active ? 2 : 1.5} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <nav aria-label="Admin" className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
        <picture className="mb-6 px-3">
          <source srcSet="/wsgreen_dark.svg" media="(prefers-color-scheme: dark)" />
          <img src="/wsgreen_light.svg" alt="WS Green admin" width={136} height={14} className="h-3.5 w-auto" />
        </picture>
        <ul className="flex flex-col gap-0.5">
          {[...items, ...desktopOnly].map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-control px-3 no-underline transition-colors duration-200 ease-out ${
                    active ? "bg-surface font-semibold" : "text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden size={18} strokeWidth={1.5} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
