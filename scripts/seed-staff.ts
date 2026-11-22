import { randomInt, randomUUID } from "node:crypto"
import { parseArgs } from "node:util"
import { hashPassword } from "better-auth/crypto"
import { Client } from "pg"
import { z } from "zod"

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "staff" },
    "temp-password": { type: "boolean", default: false },
    "reset-passkeys": { type: "boolean", default: false },
  },
})

const args = z
  .object({
    email: z.email().transform((e) => e.trim().toLowerCase()),
    name: z.string().min(2),
    role: z.enum(["owner", "staff", "none"]),
    "temp-password": z.boolean(),
    "reset-passkeys": z.boolean(),
  })
  .parse(values)

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
function temporaryPassword() {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-")
}

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
  let password: string | null = null
  if (args["temp-password"]) {
    password = temporaryPassword()
    const hash = await hashPassword(password)
    const updated = await client.query(`UPDATE account SET password = $2, updated_at = now() WHERE user_id = $1 AND provider_id = 'credential'`, [id, hash])
    if (!updated.rowCount) {
      await client.query(`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ($1, $2, 'credential', $2, $3, now(), now())`, [randomUUID(), id, hash])
    }
    await client.query(`UPDATE "user" SET must_change_password = true WHERE id = $1`, [id])
    await client.query("DELETE FROM session WHERE user_id = $1", [id])
  }
  if (args["reset-passkeys"]) {
    await client.query("DELETE FROM passkey WHERE user_id = $1", [id])
    await client.query("DELETE FROM session WHERE user_id = $1", [id])
  }
  await client.query("COMMIT")
  console.info(`${args.email} is ${args.role}.${args["reset-passkeys"] ? " Passkeys and sessions removed." : ""}`)
  if (password) console.info(`Temporary password for ${args.email}: ${password}\nIt must be changed at first sign-in. It is not stored anywhere in readable form.`)
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
