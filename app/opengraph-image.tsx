import { ImageResponse } from "next/og"
import { Mark } from "@/lib/brand-mark"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "WS Green, EV spare parts from Gulab Auto Garage, Malad West, Mumbai"

export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, padding: 88, background: "#eef1ee", color: "#151916" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Mark size={96} />
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>WS Green</div>
      </div>
      <div style={{ fontSize: 46, maxWidth: 900, lineHeight: 1.2 }}>EV scooter spare parts: BMS, controllers, brakes, lights and body parts</div>
      <div style={{ fontSize: 32, color: "#4a544d" }}>Gulab Auto Garage, Malad West, Mumbai</div>
    </div>,
    size,
  )
}
