import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgres://test:test@127.0.0.1:5432/test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-00",
      BETTER_AUTH_URL: "http://localhost:3000",
      PHONE_PEPPER: "test-pepper-test-pepper-test-pepper-00",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
  },
})
