import type { Metadata } from "next"
import Link from "next/link"
import AddButton from "@/components/AddButton"
import PageHead from "@/components/PageHead"
import WhatsAppLink from "@/components/WhatsAppLink"
import { formatPaise, unitWord } from "@/lib/format"
import { hasRetailTier, minQty } from "@/lib/pricing"
import { catalog, type Tile } from "@/lib/storefront"
import { code as codeClass } from "@/lib/ui"

export const metadata: Metadata = {
  title: "Price list",
  description: "Counter and wholesale prices for EV scooter parts at Gulab Auto Garage, Malad West, Mumbai.",
  alternates: { canonical: "/prices", types: { "text/csv": "/prices.csv" } },
}

function stockText(t: Tile) {
  if (t.stock.kind === "out") return "Out of stock"
  if (t.stock.kind === "low") return `Only ${String(t.stock.left)} left`
  return "Ask for stock"
}

export default async function PricesPage() {
  const data = await catalog()
  const rows = data.tiles
  const groups = data.systems.map((s) => ({ s, rows: rows.filter((t) => t.systemSlug === s.slug) })).filter((g) => g.rows.length > 0)
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <PageHead back={{ href: "/", label: "Home" }} title="Price list">
        <p className="max-w-[60ch] text-muted">Every part we sell, with its counter price. Where a part has a wholesale break, buy that many or more and every piece is charged at the wholesale price.</p>
        {rows.length ? (
          <a href="/prices.csv" download className="w-fit text-sm font-medium">
            Download as CSV
          </a>
        ) : null}
      </PageHead>
      {groups.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-8">
          <p>No parts are listed yet. Ask on WhatsApp for any part.</p>
          <WhatsAppLink text="Hi, please send me your price list." variant="secondary">
            Ask on WhatsApp
          </WhatsAppLink>
        </div>
      ) : (
        groups.map(({ s, rows: list }) => (
          <section key={s.slug} aria-labelledby={`p-${s.slug}`} className="mt-8">
            <h2 id={`p-${s.slug}`} className="text-lg">
              {s.name}
            </h2>
            <table className="mt-3 w-full border-collapse text-left text-sm">
              <thead className="sr-only sm:not-sr-only">
                <tr className="border-b border-line-strong text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Part</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Minimum</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Retail</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Wholesale</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Stock</th>
                  <th scope="col" className="py-2 font-medium">Buy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((t) => (
                  <tr key={t.id} className="grid grid-cols-2 gap-x-3 py-3 sm:table-row sm:py-0">
                    <th scope="row" className="col-span-2 font-normal sm:py-3 sm:pr-4">
                      <Link href={`/p/${t.slug}`} className="no-underline [@media(hover:hover)]:hover:underline">
                        {t.code ? <span className={`block ${codeClass}`}>{t.code}</span> : null}
                        <span className="text-muted">{t.name}</span>
                      </Link>
                    </th>
                    <td className="sm:py-3 sm:pr-4">
                      <span className="text-muted sm:hidden">Minimum </span>
                      {minQty(t.priced)} {unitWord(t.unit, minQty(t.priced))}
                    </td>
                    <td className={`sm:table-cell sm:py-3 sm:pr-4 ${t.priced.retailPaise !== null && hasRetailTier(t.priced) ? "" : "hidden"}`}>
                      <span className="text-muted sm:hidden">Retail </span>
                      {t.priced.retailPaise !== null && hasRetailTier(t.priced) ? formatPaise(t.priced.retailPaise) : "No bulk price"}
                    </td>
                    <td className="font-semibold sm:py-3 sm:pr-4">
                      <span className="font-normal text-muted sm:hidden">{t.priced.retailPaise !== null && hasRetailTier(t.priced) ? "Wholesale " : "Price "}</span>
                      {formatPaise(t.priced.wholesalePaise)}
                      {t.priced.moq > 1 ? <span className="font-normal text-muted"> from {t.priced.moq}</span> : null}
                    </td>
                    <td className={`text-muted sm:table-cell sm:py-3 sm:pr-4 ${t.stock.kind === "untracked" ? "hidden" : ""}`}>{stockText(t)}</td>
                    <td className="col-span-2 sm:py-2">{t.purchasable ? <AddButton id={t.id} priced={t.priced} name={t.name} size="row" /> : <span className="text-sm text-muted">At the shop</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  )
}
