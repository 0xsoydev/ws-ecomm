import type { Metadata } from "next"
import PageHead from "@/components/PageHead"
import WhatsAppLink from "@/components/WhatsAppLink"
import { bookService } from "@/lib/whatsapp"

export const metadata: Metadata = {
  title: { absolute: "EV scooter repair and BMS service in Malad West | WS Green" },
  description: "BMS repair, controller swap, battery checks and repairs for all two-wheelers at Gulab Auto Garage, Malad West, Mumbai. Book on WhatsApp.",
  alternates: { canonical: "/service" },
}

const SERVICES = [
  { name: "BMS repair or replacement", fixes: "Battery not charging, cutting off under load, or one cell group draining faster." },
  { name: "Controller check and swap", fixes: "Scooter not moving, jerking, error codes or a burnt smell." },
  { name: "Battery check", fixes: "Range dropped, swelling, or the pack runs hot." },
  { name: "Wiring, lights and switches", fixes: "Throttle, horn, indicators, headlight or meter not working." },
  { name: "Brakes and suspension", fixes: "Worn pads, loose cables, noisy or leaking shockers." },
  { name: "General two-wheeler repair", fixes: "Electric and petrol scooters and bikes." },
]

export default function ServicePage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Home" }} title="Workshop and repairs">
        <p className="max-w-[60ch] text-muted">Bring your scooter to the shop in Malad West. We check it first and tell you the price before any work starts.</p>
      </PageHead>
      <ul className="mt-4 divide-y divide-line">
        {SERVICES.map((s) => (
          <li key={s.name} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg">{s.name}</h2>
              <p className="max-w-[52ch] text-muted">{s.fixes}</p>
              <p className="text-sm">Price after a check</p>
            </div>
            <WhatsAppLink text={bookService(s.name.toLowerCase(), null)} variant="secondary" className="shrink-0 self-start sm:self-auto">
              Book on WhatsApp
            </WhatsAppLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
