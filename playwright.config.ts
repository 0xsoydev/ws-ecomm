import { defineConfig, devices } from "@playwright/test"

const port = 3300
const env = {
  DATABASE_URL: "postgres://postgres@127.0.0.1:55440/postgres",
  BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-00",
  BETTER_AUTH_URL: `http://localhost:${String(port)}`,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${String(port)}`,
  PHONE_PEPPER: "e2e-pepper-e2e-pepper-e2e-pepper-e2e-00",
  BUILD_CPUS: "1",
}
const executablePath = process.env.PW_CHROMIUM

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${String(port)}`, trace: "retain-on-failure", launchOptions: executablePath ? { executablePath } : {} },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    { command: "bun e2e/db.ts", port: 55440, reuseExistingServer: !process.env.CI, timeout: 60000 },
    { command: `bun run build && bun run start -p ${String(port)}`, url: `http://localhost:${String(port)}`, env, reuseExistingServer: !process.env.CI, timeout: 600000 },
  ],
})
