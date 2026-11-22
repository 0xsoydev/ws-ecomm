# Deliberate shortcuts

Code carries no comments, so known ceilings and upgrade paths live here.

- **CSP**: one static host allow-list with `'unsafe-inline'` for every route, shipped as `Content-Security-Policy-Report-Only`. Compensating controls: no user-supplied HTML, the UPI ID also sent in the WhatsApp message, daily UTR reconciliation. Upgrade: a nonce policy on `/checkout`, `/order` and `/admin` (routes that `await connection()`). Enforce after Playwright shows no violations.
- **OTP enrolment window**: Better Auth's session refresh extends any session to the full 7 days on first read, so a 15-minute `expiresAt` cannot hold. The window is enforced from `session.createdAt` instead (`enrolmentExpired` in `lib/auth.ts`, used by `getAdminSession` and the passkey registration hook). The OTP session row itself lingers until the purge.
- **`auth_event.user_id`** has no foreign key on purpose: events must outlive banned or deleted users.
- **Better Auth CLI and `server-only`**: the `auth` CLI cannot load a config that imports `server-only`. `bun run auth:generate` runs it from `scripts/auth-cli`, whose `tsconfig.json` maps `server-only` to its empty module, with `JITI_FS_CACHE=false` so stale transforms are not reused.
- **`rate_limit` fixed windows**: burst at a window edge accepted.
- **Library majors**: TypeScript 7 waits for typescript-eslint support (`<6.1.0` today); Drizzle 1.0 waits for a stable release.
- **`forbidden()`** still needs the experimental `authInterrupts` flag, so `requireRole` redirects instead of returning 403 pages.
- **Storefront catalogue cache**: `catalog()` in `lib/storefront.ts` loads all active products into one cache entry tagged `catalog`; listings, search, vehicle pages and `/api/catalog-snapshot` filter it in memory. Fine at a few hundred SKUs; split by system once the catalogue passes about 5,000.
- **Sheet history entries**: `useBackToClose` pushes one history entry per open sheet. Following a link from inside an open sheet leaves that entry behind, so Back returns to the same page once before leaving it.
- **Phase 3 interaction gaps** (plan `ws-ecomm-phase3-storefront.md`): header search is a native GET form to `/search`, not the typeahead overlay; the desktop cart opens the `/cart` page, not a drawer; cart lines remove through the stepper (bin at the minimum) with Undo, without swipe; the wholesale explainer is static text until a product has an approved retail price to animate; typed quantities use a native numeric input instead of Base UI NumberField.
