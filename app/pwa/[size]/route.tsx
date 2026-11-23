import { ImageResponse } from "next/og"
import { Mark } from "@/lib/brand-mark"

const SIZES = [192, 512]

export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }))
}

export async function GET(_: Request, { params }: RouteContext<"/pwa/[size]">) {
  const px = Number((await params).size)
  if (!SIZES.includes(px)) return new Response(null, { status: 404 })
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#151916" }}>
      <Mark size={Math.round(px * 0.6)} />
    </div>,
    { width: px, height: px },
  )
}
