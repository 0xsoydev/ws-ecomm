import { Client } from "pg"
import { z } from "zod"

const env = z
  .object({
    DATABASE_URL_OWNER: z.url(),
    MIGRATE_DB_PASSWORD: z.string().min(24),
    APP_DB_PASSWORD: z.string().min(24),
    BACKUP_DB_PASSWORD: z.string().min(24),
  })
  .parse(process.env)

const client = new Client({ connectionString: env.DATABASE_URL_OWNER })
await client.connect()

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`

async function ensureRole(name: "migrate" | "app" | "backup", password: string) {
  const exists = await client.query("select 1 from pg_roles where rolname = $1", [name])
  const verb = exists.rowCount ? "ALTER" : "CREATE"
  await client.query(`${verb} ROLE ${name} WITH LOGIN PASSWORD ${literal(password)}`)
}

try {
  await ensureRole("migrate", env.MIGRATE_DB_PASSWORD)
  await ensureRole("app", env.APP_DB_PASSWORD)
  await ensureRole("backup", env.BACKUP_DB_PASSWORD)
  const { rows } = await client.query<{ db: string }>("select current_database() as db")
  const database = rows[0]?.db
  if (!database) throw new Error("No current database")
  const statements = [
    `GRANT CONNECT, CREATE ON DATABASE "${database}" TO migrate`,
    `GRANT CONNECT ON DATABASE "${database}" TO app, backup`,
    "GRANT USAGE, CREATE ON SCHEMA public TO migrate",
    "GRANT USAGE ON SCHEMA public TO app, backup",
    "ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app",
    "ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app",
    "ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public GRANT SELECT ON TABLES TO backup",
    "ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public GRANT SELECT ON SEQUENCES TO backup",
    "ALTER DEFAULT PRIVILEGES FOR ROLE migrate IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC",
  ]
  for (const statement of statements) await client.query(statement)
  console.info("Roles migrate, app and backup are ready. Use them in DATABASE_URL_MIGRATE, DATABASE_URL and DATABASE_URL_BACKUP.")
} finally {
  await client.end()
}
