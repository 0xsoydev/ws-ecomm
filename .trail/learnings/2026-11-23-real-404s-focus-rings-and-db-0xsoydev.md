---
title: "Real 404s, focus rings and DB error codes under Next 16 and Tailwind 4"
author: 0xsoydev
date: 2026-11-23
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-6c0deb71
scope: repo
status: active
src: agent
touches:
  - lib/db.ts
---

## Decided
Dynamic store routes export `ensureStatic = "navigation"`, so an unknown slug waits for the full render and `notFound()` sends HTTP 404 instead of a streamed 200. `generateMetadata` returns `{ title: "Page not found" }` for missing slugs, because only the root `app/not-found.tsx` may export metadata. `app/not-found.tsx` wraps the store layout so bad top-level URLs keep the shop chrome.
Pages that read cookies and then query uncached data (`/order/[number]`) call `await connection()` first; otherwise Partial Prefetching's runtime prefetch renders them with cookies available and `pg` trips the `Date.now()` prerender error.
Drizzle wraps Postgres errors as "Failed query: ..."; the constraint name is on `error.cause.constraint`. Use `violated(e)` from `lib/db.ts`, never a regex on `e.message`.

## Tried and ruled out
`dynamicParams = false` fails the build with Cache Components. Awaiting params outside Suspense breaks instant-navigation validation.

## Watch out
Tailwind 4 `outline-hidden` (and `outline-none`) set `--tw-outline-style: none`, and `focus-visible:outline-2` reads that variable, so the ring never shows. Pair them with `focus-visible:outline-solid`; an e2e test checks the card Add button.
PGlite's socket server multiplexes all connections over one session: a page regenerating during an order transaction can read nothing and cache a 404. `placeOrder` only invalidates `catalog` when tracked stock changed.
