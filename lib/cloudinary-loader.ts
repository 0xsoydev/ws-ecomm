"use client"

import { publicEnv } from "./env.public"

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const fill = src.startsWith("fill:")
  const publicId = fill ? src.slice(5) : src
  const crop = fill ? "c_fill,ar_1:1" : "c_pad,ar_1:1,b_white"
  return `https://res.cloudinary.com/${publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_${quality ?? "auto"},w_${width},${crop}/${publicId}`
}
