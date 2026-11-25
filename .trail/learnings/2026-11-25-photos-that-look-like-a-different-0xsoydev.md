---
title: Photos that look like a different variant on one listing are intentional
author: 0xsoydev
date: 2026-11-25
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-73ed5dda
scope: repo
status: active
src: agent
touches:
  - scripts/migrate-legacy.ts
---

## Decided
- The owner reviewed the multi-photo products (26 Nov 2026) and kept every photo that looked like a different part or variant (products 364, 245, 268, 324, 375, 384, 389), because the old catalogue put several real variants and angles of the same shop item on one listing on purpose. `scripts/migrate-legacy.ts` imports all of them into `product_image`, and that is correct.

## Watch out
- Don't remove or flag a photo in the Photos section of `app/admin/(app)/products/[id]/product-editor.tsx` just because it looks like a different variant; only exact pixel duplicates (`magick compare -metric RMSE` gives 0) are clear removals, otherwise the owner has to re-review the same photos.
