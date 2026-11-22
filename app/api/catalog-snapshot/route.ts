import { catalog } from "@/lib/storefront"

export async function GET() {
  return Response.json(await catalog(), { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } })
}
