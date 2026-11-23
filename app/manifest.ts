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
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  }
}
