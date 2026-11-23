import "server-only"
import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as authSchema from "./auth-schema"
import { env } from "./env"
import * as appSchema from "./schema"

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10, idleTimeoutMillis: 5000 })
attachDatabasePool(pool)

export const schema = { ...appSchema, ...authSchema }
export const db = drizzle({ client: pool, schema, casing: "snake_case" })

export function violated(e: unknown) {
  const cause = e instanceof Error ? e.cause : null
  return typeof cause === "object" && cause !== null && "constraint" in cause && typeof cause.constraint === "string" ? cause.constraint : null
}
