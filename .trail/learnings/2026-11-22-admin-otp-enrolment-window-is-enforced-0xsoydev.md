---
title: Admin OTP enrolment window is enforced from session.createdAt in lib/auth.ts
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 2, tokens: 0 }
id: l-3f414157
scope: repo
status: active
src: agent
touches:
  - lib/auth.ts
  - package.json
  - scripts/auth-cli/tsconfig.json
  - lib/schema.ts
---

## Decided
In `lib/auth.ts`, the 15-minute OTP enrolment session is checked with `enrolmentExpired(session)` (createdAt + 15 min) inside `getAdminSession` and in `hooks.before` for `/passkey/generate-register-options` and `/passkey/verify-registration`. OTP sessions may register a passkey only when the user has none yet.
`bun run auth:generate` (package.json) runs the `auth` CLI, which replaced `@better-auth/cli`, from `scripts/auth-cli/tsconfig.json`, which maps `server-only` to `node_modules/server-only/empty.js`. It runs under `bun --env-file=.env.local --bun` with `JITI_FS_CACHE=false`. In `lib/auth.ts`, Better Auth's rate-limit model is renamed `auth_rate_limit` because `lib/schema.ts` already has `rate_limit`.

## Tried and ruled out
Setting `expiresAt` to now + 15 min in `databaseHooks.session.create.before`. Better Auth's session refresh (expiresIn 7 d, updateAge 1 d) treats that session as due for refresh on its first read and extends it to 7 days.
`JITI_ALIAS`, `--conditions=react-server`, and Node via `bunx`: the CLI ignores them or loses `.env.local`. A cached jiti transform made the tsconfig alias look broken until the cache was disabled.

## Watch out
`getSessionFromCtx` does not type the `authMethod` additional field, so narrow it from `unknown`. The session-creating passkey endpoint is `/passkey/verify-authentication`, not `/sign-in/passkey`.
