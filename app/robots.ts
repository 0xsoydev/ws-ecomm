import type { MetadataRoute } from "next"
import { env } from "@/lib/env"
import { publicEnv } from "@/lib/env.public"

const PRIVATE = ["/cart", "/checkout", "/order", "/admin", "/api/"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    sitemap: env.SITE_INDEXABLE ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/sitemap.xml` : undefined,
  }
}
