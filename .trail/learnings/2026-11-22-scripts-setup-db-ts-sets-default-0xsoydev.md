---
title: "scripts/setup-db.ts sets default privileges while connected as migrate, because the Neon owner cannot"
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-921167a9
scope: repo
status: active
src: agent
touches:
  - scripts/setup-db.ts
---

## Decided
`scripts/setup-db.ts` creates the `migrate`, `app` and `backup` roles as `neondb_owner`, then reconnects as `migrate` to run `ALTER DEFAULT PRIVILEGES IN SCHEMA public …` for its own future tables and sequences. `DATABASE_URL` is the `app` role on the pooled host; `DATABASE_URL_MIGRATE`, `DATABASE_URL_BACKUP` and `DATABASE_URL_OWNER` use the direct host (no `-pooler`). Package scripts load `.env.local` with `bun --env-file=.env.local`.

## Tried and ruled out
`ALTER DEFAULT PRIVILEGES FOR ROLE migrate` as `neondb_owner`: Postgres 18 on Neon rejects it with "permission denied to change default privileges", because the owner is not a member of `migrate`.

## Watch out
`scripts/migrate-legacy.ts` fetches image sizes from Cloudinary's public `fl_getinfo` (no API secret needed). Each request has a 15 s timeout and retries; without that, one hung request stalled a whole run. Sizes are only fetched for products without images, so reruns skip the network.
