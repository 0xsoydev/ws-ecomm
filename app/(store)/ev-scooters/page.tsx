import type { Metadata } from "next"
import PageHead from "@/components/PageHead"
import WhatsAppLink from "@/components/WhatsAppLink"

export const metadata: Metadata = {
  title: "Electric scooters",
  description: "Ask Gulab Auto Garage, Malad West, about electric scooters for sale and service.",
  alternates: { canonical: "/ev-scooters" },
}

export default function EvScootersPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Home" }} title="Electric scooters">
        <p className="max-w-[60ch] text-muted">We sell and service electric scooters at the shop in Malad West. Models and prices change often, so ask us for what is in stock today.</p>
      </PageHead>
      <WhatsAppLink text="Hi, which electric scooters do you have in stock?" variant="ink" className="mt-4">
        Ask about scooters on WhatsApp
      </WhatsAppLink>
    </div>
  )
}
