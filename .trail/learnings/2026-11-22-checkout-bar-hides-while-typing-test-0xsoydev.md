---
title: Checkout bar hides while typing; test and idempotency-key gotchas
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-ac1c6612
scope: repo
status: active
src: agent
touches:
  - app/globals.css
---

## Decided
The sticky bottom bars (`data-bar`) hide while any text input has focus on touch screens (`app/globals.css`), so the Android keyboard never pushes them over the field. Place order lives in such a bar on phones.

## Watch out
Playwright `tap()` on the checkout submit button times out with "element is not visible" right after `fill()`: blur the active element first, as a user closing the keyboard would. `crypto.randomUUID()` in `useState` breaks the build under Cache Components (unstable value in a prerendered client component); the checkout idempotency key is created lazily in a ref on submit.
