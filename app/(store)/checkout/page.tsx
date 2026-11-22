import type { Metadata } from "next"
import CheckoutForm from "@/components/CheckoutForm"
import PageHead from "@/components/PageHead"
import { storeInfo } from "@/lib/storefront"

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } }

export default async function CheckoutPage() {
  const info = await storeInfo()
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 sm:px-6 lg:pb-0">
      <PageHead back={{ href: "/cart", label: "Cart" }} title="Checkout" />
      <CheckoutForm scope={info.scope} courier={!info.pickupOnly} minOrderPaise={info.minOrderPaise} />
    </div>
  )
}
