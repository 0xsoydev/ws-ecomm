"use client"

import Lightbox from "yet-another-react-lightbox"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"
import { publicEnv } from "@/lib/env.public"
import type { PublicImage } from "@/lib/storefront"

const src = (i: PublicImage, w: number) => `https://res.cloudinary.com/${publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${String(w)}/${i.publicId}`

export default function ZoomView({ images, index, alt, onClose }: { images: PublicImage[]; index: number; alt: string; onClose: () => void }) {
  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
      carousel={{ finite: true }}
      styles={{ container: { backgroundColor: "rgb(21 25 22 / 0.96)" } }}
      slides={images.map((i) => ({ src: src(i, 1600), alt: i.alt || alt, width: i.width, height: i.height, srcSet: [800, 1200, 1600, 2000].map((w) => ({ src: src(i, w), width: w, height: Math.round((i.height / i.width) * w) })) }))}
    />
  )
}
