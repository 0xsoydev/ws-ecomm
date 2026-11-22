import { Client } from "pg"
import { policies } from "./policies"

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
for (const p of policies) {
  const r = await client.query("insert into page (slug, title, body) values ($1, $2, $3) on conflict (slug) do nothing", [p.slug, p.title, p.body])
  console.log(p.slug, r.rowCount ? "added" : "kept existing")
}
await client.end()
