import { catalog } from "@/lib/storefront"

export async function GET() {
  const data = await catalog()
  const tiles = data.tiles.map((t) => ({ ...t, compliant: undefined, approved: undefined }))
  return Response.json({ ...data, tiles }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } })
}
