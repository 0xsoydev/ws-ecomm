import { PackageSearch } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Products" }

export default function ProductsPage() {
  return (
    <div className="sticky top-6 hidden h-[calc(100dvh-3rem)] flex-col items-center justify-center gap-3 rounded-container border border-dashed border-line-strong text-center text-muted xl:flex">
      <PackageSearch aria-hidden size={32} strokeWidth={1.25} />
      <p className="max-w-[36ch]">Pick a product to edit its price, photos, vehicles, stock and details in one place.</p>
    </div>
  )
}
