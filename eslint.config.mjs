import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import tseslint from "typescript-eslint"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "no-restricted-properties": ["error", { object: "process", property: "env", message: "Read env through lib/env.ts or lib/env.public.ts" }],
    },
  },
  {
    files: ["lib/env.ts", "lib/env.public.ts", "next.config.ts", "drizzle.config.ts", "scripts/**", "vitest.config.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**", "lib/auth-schema.ts", "graft/**", ".trail/**", ".opencode/**"]),
])
