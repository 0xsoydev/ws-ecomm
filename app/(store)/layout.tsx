import { Suspense } from "react"
import BottomBar, { BottomBarView } from "@/components/BottomBar"
import type { BrowseSystem } from "@/components/BrowseSheet"
import Providers from "@/components/Providers"
import StoreFooter from "@/components/StoreFooter"
import StoreHeader from "@/components/StoreHeader"
import { catalog, storeInfo } from "@/lib/storefront"

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [info, data] = await Promise.all([storeInfo(), catalog()])
  const systems: BrowseSystem[] = data.systems.map((s) => ({ slug: s.slug, name: s.name, shortName: s.shortName, count: s.count }))
  return (
    <Providers>
      <a href="#main" className="sr-only z-50 rounded-control bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <StoreHeader systems={systems} />
      <main id="main">{children}</main>
      <StoreFooter info={info} />
      <Suspense fallback={<BottomBarView pathname={null} systems={systems} />}>
        <BottomBar systems={systems} />
      </Suspense>
    </Providers>
  )
}
