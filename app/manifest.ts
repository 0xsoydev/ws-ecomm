import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WS Green by Gulab Auto",
    short_name: "WS Green",
    description: "EV two-wheeler spare parts from Gulab Auto Garage, Malad West, Mumbai.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef1ee",
    theme_color: "#eef1ee",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
