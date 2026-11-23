import Image from "next/image"
import type { PublicImage } from "@/lib/storefront"

export default function ProductImage({ image, alt, sizes, preload = false }: { image: PublicImage; alt: string; sizes: string; preload?: boolean }) {
  return <Image src={image.onWhite ? image.publicId : `fill:${image.publicId}`} alt={alt} fill sizes={sizes} preload={preload} className="object-contain" />
}
