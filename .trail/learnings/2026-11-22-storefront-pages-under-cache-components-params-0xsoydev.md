---
title: "Storefront pages under Cache Components: params in Suspense, unique SVG ids, compiler-safe handlers"
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-854fe61a
scope: repo
status: active
src: agent
---

## Decided
Every dynamic storefront page (`/c/[system]`, `/p/[slug]`, `/v/[brand]/[model]`, `/pages/[slug]`) renders a static wrapper and awaits `params` inside a `<Suspense>` child with a content-shaped skeleton (`components/Skeletons.tsx`). Next 16.4 instant-navigation validation requires this even when `generateStaticParams` lists every value. `generateStaticParams` must return at least one entry, so `/pages/[slug]` lists the policy slugs from `lib/pages.ts`.

Client state read from localStorage goes through `useSyncExternalStore` (`lib/use-stored.ts`, `lib/cart.ts`), never `setState` in an effect.

## Tried and ruled out
Curried pointer handlers (`onPointerDown={startHold(-1)}`) fail the React compiler lint ("Cannot access refs during render"); call them inline instead. `const Icon = systemIcon(slug)` fails `react-hooks/static-components`; use `components/SystemIcon.tsx`.

## Watch out
An SVG gradient referenced by id inside a `display: none` subtree stops rendering for every other copy using that id: `components/Logo.tsx` uses `useId()`. Tailwind display utilities on one element fight (`hidden lg:inline-flex` with `inline-flex` from a button class): wrap in a container instead. Storefront screenshots with buyable products need the local PGlite copy with fixtures, because Neon has no purchasable product yet.
