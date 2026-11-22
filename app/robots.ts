import type { MetadataRoute } from "next"
import { env } from "@/lib/env"
import { publicEnv } from "@/lib/env.public"

const BOTS = ["Googlebot", "Google-Extended", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User", "Applebot", "Applebot-Extended", "CCBot", "Meta-ExternalAgent"]
const PRIVATE = ["/cart", "/checkout", "/order", "/track", "/admin", "/api/"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [...BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })), { userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: env.SITE_INDEXABLE ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/sitemap.xml` : undefined,
  }
}
