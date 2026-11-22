import Link from "next/link"
import { publicEnv } from "@/lib/env.public"
import { priceCopy } from "@/lib/pricing"
import type { Tile } from "@/lib/storefront"
import { code as codeClass } from "@/lib/ui"
import { askAboutPart } from "@/lib/whatsapp"
import AddButton from "./AddButton"
import Placeholder from "./Placeholder"
import PriceLines from "./PriceLines"
import ProductImage from "./ProductImage"
import { badgeTone, stockBadge } from "./stock-badge"
import WhatsAppLink from "./WhatsAppLink"

export default function ProductTile({ tile, sizes }: { tile: Tile; sizes: string }) {
  const badge = stockBadge(tile)
  const label = tile.code ?? tile.name
  const buyable = tile.purchasable && tile.stock.kind !== "out"
  return (
    <article className="group relative flex w-full flex-col gap-2.5">
      <div className="relative aspect-square overflow-hidden rounded-container bg-well outline -outline-offset-1 outline-ink/10">
        {tile.image ? <ProductImage image={tile.image} alt={tile.name} sizes={sizes} /> : <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="tile" />}
        {badge ? <span className={`absolute top-2 left-2 rounded-full border bg-surface px-2 py-0.5 text-xs font-medium ${badgeTone[badge.tone]}`}>{badge.text}</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-[0.9375rem] leading-snug">
          <Link href={`/p/${tile.slug}`} className="no-underline after:absolute after:inset-0 after:rounded-container [@media(hover:hover)]:group-hover:underline">
            {tile.code ? <span className={`block ${codeClass}`}>{tile.code}</span> : null}
            <span className={tile.code ? "line-clamp-2 text-sm font-normal text-muted" : "line-clamp-2 font-semibold"}>{tile.name}</span>
          </Link>
        </h3>
        <div className="mt-auto pt-1">
          <PriceLines copy={priceCopy(tile.priced, tile.unit)} />
        </div>
      </div>
      {buyable ? (
        <AddButton id={tile.id} priced={tile.priced} name={label} size="tile" />
      ) : (
        <WhatsAppLink text={askAboutPart(tile.code, tile.name, `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${tile.slug}`)} variant="tile" className="relative z-10 w-full">
          Ask on WhatsApp
        </WhatsAppLink>
      )}
    </article>
  )
}
