import Link from "next/link"
import { BUSINESS } from "@/lib/business"
import type { storeInfo } from "@/lib/storefront"
import { telLink } from "@/lib/whatsapp"
import Logo from "./Logo"

type Info = Awaited<ReturnType<typeof storeInfo>>

const links = [
  { href: "/prices", label: "Price list" },
  { href: "/store", label: "Visit the shop" },
  { href: "/service", label: "Workshop" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/pages/shipping", label: "Pickup and delivery" },
  { href: "/pages/returns", label: "Returns and refunds" },
  { href: "/pages/warranty", label: "Warranty" },
  { href: "/pages/terms", label: "Terms" },
  { href: "/pages/privacy", label: "Privacy" },
] as const

const link = "no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:underline"

export default function StoreFooter({ info }: { info: Info }) {
  return (
    <footer className="mt-16 border-t border-line pb-[calc(var(--chrome-b)+24px)] text-sm text-muted">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 pt-10 sm:grid-cols-[1.2fr_1fr] sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo className="h-4 w-auto self-start" />
          <p className="text-ink">
            Sold by {info.legalName} ({BUSINESS.brand})
          </p>
          <address className="not-italic">{BUSINESS.address}</address>
          <p>
            <a href={telLink} className={link}>
              {BUSINESS.phone}
            </a>
            <br />
            <a href={`mailto:${BUSINESS.email}`} className={link}>
              {BUSINESS.email}
            </a>
          </p>
          {info.gstin ? <p>GSTIN {info.gstin}</p> : null}
          {info.grievanceOfficer ? (
            <p>
              Grievance officer: {info.grievanceOfficer.name}, {info.grievanceOfficer.designation}.{" "}
              <a href={`mailto:${info.grievanceOfficer.email}`} className={link}>
                {info.grievanceOfficer.email}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label="Footer" className="lg:col-span-2">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 lg:grid-cols-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
