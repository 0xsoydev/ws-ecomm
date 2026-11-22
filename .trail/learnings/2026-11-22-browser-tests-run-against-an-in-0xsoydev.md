---
title: Browser tests run against an in-process Postgres with one build CPU
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-db1303b1
scope: repo
status: active
src: agent
---

## Decided
Browser tests live in `e2e/` (Playwright 1.51.1, Pixel 7 and desktop) and run against `e2e/db.ts`, an in-process PGlite with all migrations, a 7-product fixture catalogue, delivery bands, the policy pages and an owner account (`e2e/constants.ts`). CI builds against that database, so the build no longer needs Neon. Run locally with `PW_CHROMIUM=<path to chromium> bun run e2e`.

## Tried and ruled out
Building against PGlite with default parallelism: the socket server drops connections and dies, so test builds use `BUILD_CPUS=1`. Docker Postgres was not available locally (daemon not running).

## Watch out
Assert with `.filter({ visible: true })`: while Suspense streams, React keeps a hidden copy of the content in the DOM, so plain `getByText` hits strict-mode violations. `pkill -f` or `pgrep -f` with a pattern that appears in your own shell command kills that shell; track background PIDs in a file. The admin area needs its own `<Toasts />` (it does not use the store `Providers`).
