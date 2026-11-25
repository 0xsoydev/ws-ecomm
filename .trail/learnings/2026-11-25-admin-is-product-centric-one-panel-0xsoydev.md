---
title: "Admin is product-centric: one panel and one Save per product"
author: 0xsoydev
date: 2026-11-25
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-6fcdfb42
scope: repo
status: active
src: agent
---

## Decided
- Every per-product change (price + approval, photo sorting/order/cover, vehicle fits, stock, specs, legal) happens in `/admin/products/[id]` and saves through one `saveProduct` transaction, because the owner asked that changes to a product never need a trip to another screen. Old Prices/Photos/Fix/Vehicles URLs redirect to `/admin/products?view=prices|photos|fix|vehicles` so bookmarks keep working.
- Bulk work stays in the list (`product-list.tsx`), because typing 200+ retail prices one panel at a time is too slow: the owner types prices in the Prices view and approves the ticked rows.

## Watch out
- `saveProduct` refuses with `conflict` when `products.updatedAt` differs from `expectedUpdatedAt`, otherwise two staff editing the same product silently overwrite each other.
- `stockSeen` keeps the DB stock when the field wasn't touched, because `confirmOrder` reserves stock while the panel may be open and a blind write would undo the reservation.
- Client navigation does not fire `beforeunload`, so every link away from the panel (list rows, prev/next, admin nav) must call `mayLeave()` from `products/workspace.ts`.
