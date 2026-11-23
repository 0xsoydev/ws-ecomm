import type { Metadata } from "next"
import { preload } from "react-dom"
import CartView from "@/components/CartView"
import PageHead from "@/components/PageHead"
import Toasts from "@/components/Toasts"
import { storeInfo } from "@/lib/storefront"

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } }

export default async function CartPage() {
  preload("/api/catalog-snapshot", { as: "fetch", crossOrigin: "anonymous" })
  const info = await storeInfo()
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Keep shopping" }} title="Cart" />
      <div className="min-h-[75dvh]">
        <CartView scope={info.scope} minOrderPaise={info.minOrderPaise} rates={{ shippingBands: info.shippingBands, freeShippingFromPaise: info.freeShippingFromPaise }} />
      </div>
      <Toasts />
    </div>
  )
}
