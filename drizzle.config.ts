import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: ["./lib/schema.ts", "./lib/auth-schema.ts"],
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL_MIGRATE ?? "" },
  strict: true,
  verbose: true,
})
