import type { Metadata } from "next"
import CartView from "@/components/CartView"
import PageHead from "@/components/PageHead"
import { storeInfo } from "@/lib/storefront"

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } }

export default async function CartPage() {
  const info = await storeInfo()
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Keep shopping" }} title="Cart" />
      <CartView scope={info.scope} minOrderPaise={info.minOrderPaise} />
    </div>
  )
}
