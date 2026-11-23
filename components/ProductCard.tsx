import Link from "next/link"
import { publicEnv } from "@/lib/env.public"
import { priceCopy } from "@/lib/pricing"
import type { Tile } from "@/lib/storefront"
import { askAboutPart, waLink } from "@/lib/whatsapp"
import AddButton from "./AddButton"
import Placeholder from "./Placeholder"
import ProductImage from "./ProductImage"
import { badgeTone, stockBadge } from "./stock-badge"

export const CARD_SIZES = "(min-width: 1280px) 220px, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"

export default function ProductCard({ tile, sizes = CARD_SIZES }: { tile: Tile; sizes?: string }) {
  const badge = stockBadge(tile)
  const copy = priceCopy(tile.priced, tile.unit)
  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-container border border-line bg-surface">
      <div className="relative aspect-square overflow-hidden border-b border-line bg-well">
        {tile.image ? (
          <div className="absolute inset-3 overflow-hidden rounded-[6px]">
            <ProductImage image={tile.image} alt={tile.name} sizes={sizes} />
          </div>
        ) : (
          <Placeholder systemSlug={tile.systemSlug} code={tile.code} size="tile" />
        )}
        {badge ? <span className={`absolute top-2 left-2 rounded-full border bg-surface px-2 py-0.5 text-xs font-medium ${badgeTone[badge.tone]}`}>{badge.text}</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-3 min-h-[3lh] text-sm leading-snug font-medium">
          <Link href={`/p/${tile.slug}`} className="no-underline after:absolute after:inset-0 [@media(hover:hover)]:group-hover:underline">
            {tile.name}
          </Link>
        </h3>
        <p className="mt-auto flex flex-col leading-tight">
          <span className="font-semibold">{copy.main}</span>
          <span className="min-h-[1lh] text-xs text-muted">{copy.sub}</span>
        </p>
        {tile.purchasable ? (
          <AddButton id={tile.id} priced={tile.priced} name={tile.name} size="card" />
        ) : (
          <a
            href={waLink(askAboutPart(tile.code, tile.name, `${publicEnv.NEXT_PUBLIC_SITE_URL}/p/${tile.slug}`))}
            target="_blank"
            rel="noopener"
            className="relative z-10 flex h-10 items-center justify-center rounded-control border border-line-strong text-sm font-medium no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-bg"
          >
            Ask when it&rsquo;s back
          </a>
        )}
      </div>
    </article>
  )
}
