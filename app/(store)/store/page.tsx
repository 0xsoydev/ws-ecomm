import { MapPin, Phone } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import PageHead from "@/components/PageHead"
import WhatsAppLink from "@/components/WhatsAppLink"
import { BUSINESS } from "@/lib/business"
import { jsonLd, localBusiness } from "@/lib/jsonld"
import { storeInfo } from "@/lib/storefront"
import { clock } from "@/lib/time"
import { button } from "@/lib/ui"
import { telLink } from "@/lib/whatsapp"

export const metadata: Metadata = {
  title: { absolute: "Gulab Auto Garage, Malad West, Mumbai: EV parts and two-wheeler repair" },
  description: "Visit Gulab Auto Garage near Milap Theatre, S.V. Road, Malad West. EV scooter parts, BMS, controllers and repairs. Open every day, 9 am to 10 pm.",
  alternates: { canonical: "/store" },
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DIRECTIONS = "https://www.google.com/maps/search/?api=1&query=Gulab%20Auto%20Garage%2C%20Malad%20West%2C%20Mumbai"

export default async function StorePage() {
  const info = await storeInfo()
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(localBusiness(info.weeklyHours, info.scope))} />
      <PageHead back={{ href: "/", label: "Home" }} title="Gulab Auto Garage, Malad West">
        <p className="max-w-[60ch] text-muted">The shop behind WS Green. We have repaired two-wheelers in Malad for over 10 years, and sell EV spare parts, BMS boards and controllers over the counter.</p>
      </PageHead>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="where" className="flex flex-col gap-4">
          <h2 id="where" className="text-xl">
            Where to find us
          </h2>
          <address className="flex gap-2 not-italic">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.5} />
            <span>
              {BUSINESS.legalName}
              <br />1 Akshardham Complex, near Milap Theatre
              <br />
              S.V. Road, Malad West, Mumbai 400064
            </span>
          </address>
          <div className="flex flex-wrap gap-2">
            <a href={DIRECTIONS} target="_blank" rel="noopener" className={button.ink}>
              <MapPin aria-hidden className="size-4.5" strokeWidth={1.75} />
              Directions
            </a>
            <a href={telLink} className={`${button.secondary} no-underline`}>
              <Phone aria-hidden className="size-4.5" strokeWidth={1.75} />
              Call {BUSINESS.phone}
            </a>
            <WhatsAppLink text="Hi, I want to visit the shop." variant="secondary">
              WhatsApp
            </WhatsAppLink>
          </div>
        </section>
        <section aria-labelledby="hours" className="flex flex-col gap-3">
          <h2 id="hours" className="text-xl">
            Opening hours
          </h2>
          <table className="w-full max-w-[420px] text-left">
            <tbody className="divide-y divide-line">
              {info.weeklyHours.map((h, i) => (
                <tr key={DAYS[i]}>
                  <th scope="row" className="py-2 font-normal">
                    {DAYS[i]}
                  </th>
                  <td className="py-2 text-right">{h ? `${clock(h.opens)} to ${clock(h.closes)}` : "Closed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {info.specialHours.length ? (
            <ul className="text-sm text-muted">
              {info.specialHours.map((s) => (
                <li key={s.day}>
                  {s.day}: {s.hours ? `${clock(s.hours.opens)} to ${clock(s.hours.closes)}` : "Closed"}. {s.note}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
      <section aria-labelledby="what" className="mt-12 flex flex-col gap-3 border-t border-line pt-8">
        <h2 id="what" className="text-xl">
          At the counter
        </h2>
        <ul className="grid max-w-[720px] gap-2 text-muted sm:grid-cols-2">
          <li>Spare parts for electric scooters and loaders</li>
          <li>BMS boards, controllers and chargers</li>
          <li>Repairs for all two-wheelers, electric and petrol</li>
          <li>Wholesale prices for garages and fleets</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/service" className={`${button.secondary} no-underline`}>
            Workshop services
          </Link>
          <Link href="/wholesale" className={`${button.secondary} no-underline`}>
            Wholesale prices
          </Link>
        </div>
      </section>
    </div>
  )
}
