---
title: Never scrollIntoView inside a sticky bar; keep reserved bottom space constant
author: 0xsoydev
date: 2026-11-23
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-eefea185
scope: repo
status: active
src: agent
touches:
  - components/ListingClient.tsx
  - e2e/flows.spec.ts
---

## Decided
The section chips (`ChipRail` in `components/ListingClient.tsx`) centre the active chip with `rail.scrollTo({ left })` on the chip row itself. The row is `relative` so `offsetLeft` is measured from it.
`StickyBar` always carries `data-bar="purchase"` and only slides out of view, so `--chrome-b` (footer padding and scroll padding) never changes while scrolling.

## Tried and ruled out
`scrollIntoView({ inline: "center", block: "nearest" })` on a chip inside the sticky nav: Chrome also scrolls the document towards the chip's unstuck position, so the page jumped back 1–23 px every time the section changed (14 backward jumps in one scroll on /c/electricals).

## Watch out
Headless Chromium's `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` doesn't scroll at all, even on a bare page. Measure scroll with "mouse" gestures or `page.mouse.wheel`. `e2e/flows.spec.ts` fails on any backward jump or page-height change.
