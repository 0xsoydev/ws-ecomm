import type { Metadata, Viewport } from "next"
import { Mona_Sans, Noto_Sans_Devanagari } from "next/font/google"
import { publicEnv } from "@/lib/env.public"
import "./globals.css"

const mona = Mona_Sans({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--font-mona", display: "swap" })
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", display: "swap", preload: false })

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: { default: "WS Green: EV spare parts and batteries in Malad West, Mumbai", template: "%s | WS Green" },
  description: "EV two-wheeler spare parts, BMS and controllers at counter prices, sold by Gulab Auto Garage, Malad West, Mumbai.",
  applicationName: "WS Green",
  openGraph: { siteName: "WS Green", locale: "en_IN", type: "website" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#121513" },
  ],
  colorScheme: "light dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${mona.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
