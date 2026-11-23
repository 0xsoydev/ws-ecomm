import type { Metadata } from "next"
import Link from "next/link"
import PageHead from "@/components/PageHead"
import ProductCard from "@/components/ProductCard"
import WhatsAppLink from "@/components/WhatsAppLink"
import { formatPaise } from "@/lib/format"
import { hasRetailTier } from "@/lib/pricing"
import { catalog, storeInfo } from "@/lib/storefront"
import { button } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Wholesale prices for EV parts",
  description: "Buy the break quantity of any part and every piece is charged at the wholesale price. No account needed. Gulab Auto Garage, Malad West, Mumbai.",
  alternates: { canonical: "/wholesale" },
}

export default async function WholesalePage() {
  const [data, info] = await Promise.all([catalog(), storeInfo()])
  const bulk = data.tiles.filter((t) => t.purchasable && t.priced.moq > 1).slice(0, 8)
  const example = data.tiles.find((t) => t.approved && t.priced.retailPaise !== null && hasRetailTier(t.priced) && t.priced.moq >= 3)
  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Home" }} title="Wholesale prices, no account needed">
        <p className="max-w-[60ch] text-muted">Every part has a break quantity. Buy that many or more and every piece is charged at the wholesale price.</p>
      </PageHead>
      <ol className="mt-6 flex flex-col gap-5">
        {[
          ["Find the break", "Each part shows its wholesale price and the quantity it starts from, for example 5 pcs."],
          ["Buy that many or more", "The whole line drops to the wholesale price. Mix as many different parts as you like."],
          ["Pick up or ask for delivery", `${info.scope}. Larger orders get a cash memo with every item listed.`],
        ].map(([title, body], i) => (
          <li key={title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full border border-line-strong text-sm font-semibold">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{title}</span>
              <span className="text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      {example && example.priced.retailPaise !== null ? (
        <section aria-labelledby="example" className="mt-10 rounded-container border border-line bg-surface p-5">
          <h2 id="example" className="text-lg">
            Example: {example.code ?? example.name}
          </h2>
          <p className="mt-2">
            {formatPaise(example.priced.retailPaise)} each for 1 to {example.priced.moq - 1}. {formatPaise(example.priced.wholesalePaise)} each from {example.priced.moq}.
          </p>
          <Link href={`/p/${example.slug}`} className="mt-2 inline-block font-medium">
            Try it on this part
          </Link>
        </section>
      ) : null}
      {bulk.length ? (
        <section aria-labelledby="bulk-parts" className="mt-10">
          <h2 id="bulk-parts" className="text-xl">
            Parts with a quantity price
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {bulk.map((t) => (
              <li key={t.id} className="flex">
                <ProductCard tile={t} />
              </li>
            ))}
          </ul>
          <Link href="/prices" className="mt-4 inline-block font-medium">
            See every price
          </Link>
        </section>
      ) : null}
      <section aria-labelledby="bulk" className="mt-10 flex flex-col items-start gap-3 border-t border-line pt-8">
        <h2 id="bulk" className="text-xl">
          Buying for a garage or fleet?
        </h2>
        <p className="max-w-[60ch] text-muted">Send your list and we will quote for the whole lot, including parts not listed online.</p>
        <div className="flex flex-wrap gap-2">
          <WhatsAppLink text="Hi, I want a bulk quote for these parts:" variant="ink">
            Ask for a bulk quote
          </WhatsAppLink>
          <Link href="/prices" className={`${button.secondary} no-underline`}>
            See the price list
          </Link>
        </div>
      </section>
    </div>
  )
}
