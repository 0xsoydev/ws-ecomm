"use client"

import dynamic from "next/dynamic"
import { useRef, useState } from "react"
import type { PublicImage } from "@/lib/storefront"
import { useBackToClose } from "@/lib/use-back-to-close"
import ProductImage from "./ProductImage"

const ZoomView = dynamic(() => import("./Zoom"), { ssr: false })

export default function Gallery({ images, alt }: { images: PublicImage[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  useBackToClose(zoom !== null, () => { setZoom(null); })
  const onScroll = () => {
    const el = track.current
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="corner-ticks relative overflow-hidden rounded-container bg-well bg-origin-content p-0 [--line-strong:var(--on-well-muted)]">
        <div ref={track} onScroll={onScroll} onPointerDown={() => void import("./Zoom")} className="flex aspect-square snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]" data-base-ui-swipe-ignore="x">
          {images.map((img, i) => (
            <button key={img.publicId} type="button" onClick={() => { setZoom(i); }} aria-label={`Zoom photo ${String(i + 1)} of ${String(images.length)}`} className="relative aspect-square w-full shrink-0 snap-center cursor-zoom-in">
              <ProductImage image={img} alt={alt} sizes="(min-width: 1024px) 560px, 100vw" preload={i === 0} />
            </button>
          ))}
        </div>
        {images.length > 1 ? (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <span key={img.publicId} className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out ${i === index ? "w-4 bg-on-well" : "w-1.5 bg-on-well-muted/50"}`} />
            ))}
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul className="hidden gap-2 lg:flex">
          {images.map((img, i) => (
            <li key={img.publicId}>
              <button
                type="button"
                aria-label={`Show photo ${String(i + 1)}`}
                aria-current={i === index}
                onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
                className="relative block size-16 overflow-hidden rounded-control bg-well outline -outline-offset-1 outline-ink/10 aria-current:outline-2 aria-current:outline-ink"
              >
                <ProductImage image={img} alt="" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {zoom !== null ? <ZoomView images={images} index={zoom} alt={alt} onClose={() => { setZoom(null); }} /> : null}
    </div>
  )
}
