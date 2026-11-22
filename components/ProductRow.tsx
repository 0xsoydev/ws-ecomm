import Link from "next/link"
import { publicEnv } from "@/lib/env.public"
import { ASK_BELOW_BREAK, priceCopy } from "@/lib/pricing"
import type { Tile } from "@/lib/storefront"
import { code as codeClass } from "@/lib/ui"
import { askAboutPart } from "@/lib/whatsapp"
import AddButton from "./AddButton"
import Placeholder from "./Placeholder"
import ProductImage from "./ProductImage"
import { badgeTone, stockBadge } from "./stock-badge"
import WhatsAppLink from "./WhatsAppLink"

export default function ProductRow({ tile }: { tile: Tile }) {
  const badge = stockBadge(tile)
  const label = tile.code ?? tile.name
  const copy = priceCopy(tile.priced, tile.unit)
  const buyable = tile.purchasable && tile.stock.kind !== "out"
  return (
    <div className="group relative flex min-h-18 items-center gap-3 py-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-control outline -outline-offset-1 outline-ink/10">
        {tile.image ? <ProductImage image={tile.image} alt={tile.name} sizes="48px" /> : <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="row" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[0.9375rem] leading-snug">
          <Link href={`/p/${tile.slug}`} className="no-underline after:absolute after:inset-0 [@media(hover:hover)]:group-hover:underline">
            {tile.code ? <span className={`block ${codeClass}`}>{tile.code}</span> : null}
            <span className={tile.code ? "line-clamp-2 text-sm font-normal text-muted" : "line-clamp-2 font-semibold"}>{tile.name}</span>
          </Link>
        </h3>
        <p className="mt-0.5 text-sm">
          <span className="font-semibold">{copy.main}</span>
          {copy.sub && copy.sub !== ASK_BELOW_BREAK ? <span className="text-muted">. {copy.sub}</span> : null}
        </p>
        {badge ? <span className={`mt-1 w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${badgeTone[badge.tone]}`}>{badge.text}</span> : null}
      </div>
      {buyable ? (
        <AddButton id={tile.id} priced={tile.priced} name={label} size="row" />
      ) : (
        <WhatsAppLink text={askAboutPart(tile.code, tile.name, `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${tile.slug}`)} variant="icon" label={`Ask on WhatsApp about ${label}`} className="relative z-10" />
      )}
    </div>
  )
}
