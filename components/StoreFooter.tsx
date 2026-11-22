import Link from "next/link"
import { BUSINESS } from "@/lib/business"
import type { storeInfo } from "@/lib/storefront"
import { hoursSummary } from "@/lib/time"
import { telLink } from "@/lib/whatsapp"
import Logo from "./Logo"
import OpenStatus from "./OpenStatus"

type Info = Awaited<ReturnType<typeof storeInfo>>

const shop = [
  { href: "/v", label: "Shop by vehicle" },
  { href: "/wholesale", label: "Wholesale prices" },
  { href: "/prices", label: "Price list" },
  { href: "/service", label: "Workshop and repairs" },
  { href: "/store", label: "Visit the shop" },
] as const

const help = [
  { href: "/pages/shipping", label: "Delivery and pickup" },
  { href: "/pages/returns", label: "Returns and refunds" },
  { href: "/pages/warranty", label: "Warranty" },
  { href: "/pages/terms", label: "Terms" },
  { href: "/pages/privacy", label: "Privacy" },
] as const

const DIRECTIONS = "https://www.google.com/maps/search/?api=1&query=Gulab%20Auto%20Garage%2C%20Malad%20West%2C%20Mumbai"
const link = "no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:underline"

export default function StoreFooter({ info }: { info: Info }) {
  return (
    <footer className="mt-16 border-t border-line pb-[calc(var(--chrome-b)+24px)] text-sm text-muted">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pt-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo className="h-4 w-auto self-start" />
          <p className="text-ink">
            Sold by {info.legalName} ({BUSINESS.brand})
          </p>
          <address className="not-italic">
            {BUSINESS.address}
            <br />
            <a href={DIRECTIONS} target="_blank" rel="noopener" className={`${link} font-medium text-ink`}>
              Get directions
            </a>
          </address>
          <p>
            <OpenStatus weekly={info.weeklyHours} special={info.specialHours} />
            <br />
            {hoursSummary(info.weeklyHours)}
          </p>
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
        <nav aria-label="Shop">
          <ul className="flex flex-col gap-2.5">
            {shop.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Help">
          <ul className="flex flex-col gap-2.5">
            {help.map((l) => (
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
