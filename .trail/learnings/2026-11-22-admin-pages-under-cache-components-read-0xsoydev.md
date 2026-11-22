---
title: "Admin pages under Cache Components: read the session before any data, and wrap usePathname in Suspense"
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-1324214f
scope: repo
status: active
src: agent
touches:
  - lib/auth.ts
---

## Decided
Admin pages in `app/admin/(app)/` render a static shell and put every data read inside a `<Suspense>` child that first awaits `requireRole` (from `lib/auth.ts`), then loads data. `AdminNav` in `app/admin/(app)/admin-nav.tsx` reads `usePathname()` and sits in a Suspense boundary whose fallback is `AdminNavView` with `pathname={null}`.

## Tried and ruled out
`Promise.all([requireRole(), searchParams, loadProductRows()])` in `app/admin/(app)/products/fix/page.tsx`: the data load starts before the session read makes the render request-time, so `todayInIndia()` (`new Date()`) runs during prerender and `next build` fails with "encountered the unstable value new Date()". `usePathname()` outside Suspense fails the build on the dynamic `/admin/products/[id]` route.

## Watch out
Mona Sans tabular figures use a slashed zero, which reads badly inside sentences; the admin uses proportional figures. Admin write paths were verified against a local PGlite copy of the migrated catalogue, not Neon, because `price_history` and `audit_log` are append-only.
