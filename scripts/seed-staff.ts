import { randomUUID } from "node:crypto"
import { parseArgs } from "node:util"
import { Client } from "pg"
import { z } from "zod"

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "staff" },
    "reset-passkeys": { type: "boolean", default: false },
  },
})

const args = z
  .object({
    email: z.email().transform((e) => e.trim().toLowerCase()),
    name: z.string().min(2),
    role: z.enum(["owner", "staff", "none"]),
    "reset-passkeys": z.boolean(),
  })
  .parse(values)

const { DATABASE_URL } = z.object({ DATABASE_URL: z.url() }).parse(process.env)
const client = new Client({ connectionString: DATABASE_URL })
await client.connect()

try {
  await client.query("BEGIN")
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO "user" (id, name, email, email_verified, role, banned, created_at, updated_at)
     VALUES ($1, $2, $3, true, $4, false, now(), now())
     ON CONFLICT (email) DO UPDATE SET name = excluded.name, role = excluded.role, banned = false, ban_reason = NULL, ban_expires = NULL, updated_at = now()
     RETURNING id`,
    [randomUUID(), args.name, args.email, args.role],
  )
  const id = rows[0]?.id
  if (!id) throw new Error("User upsert returned no id")
  if (args["reset-passkeys"]) {
    await client.query("DELETE FROM passkey WHERE user_id = $1", [id])
    await client.query("DELETE FROM session WHERE user_id = $1", [id])
  }
  await client.query("COMMIT")
  console.info(`${args.email} is ${args.role}${args["reset-passkeys"] ? "; passkeys and sessions removed, enrol again with an email code" : ""}.`)
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
