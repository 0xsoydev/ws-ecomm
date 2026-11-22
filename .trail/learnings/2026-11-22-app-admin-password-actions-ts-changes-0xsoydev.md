---
title: "app/admin/password/actions.ts changes the password without rotating the session, then the form does a full reload"
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-fc905607
scope: repo
status: active
src: agent
touches:
  - app/admin/password/actions.ts
  - lib/auth.ts
---

## Decided
`changePassword` in `app/admin/password/actions.ts` calls Better Auth with `revokeOtherSessions: false`, deletes the user's other `session` rows itself, clears `mustChangePassword`, and returns `{ done: true }`; `password-form.tsx` then does `window.location.replace` to `/admin`. `authMethodFor` in `lib/auth.ts` no longer allows `/change-password`. With Gmail configured (`lib/email.ts`), `/sign-in/email` yields `unknown` and only `/two-factor/verify-otp` creates a `password` session.

## Tried and ruled out
`revokeOtherSessions: true`: the action response re-renders the page with the old, now-deleted session cookie and bounces to sign-in. `redirect("/admin")` from the action, with or without `refresh()`: the in-response render still read `mustChangePassword` as true and bounced back to `/admin/password`, while any later request read it correctly.

## Watch out
Test the emailed-code flow locally with `SMTP_HOST=127.0.0.1 SMTP_PORT=2525` and any SMTP sink; the per-user `twoFactorEnabled` flag is set at each password sign-in from whether email is configured.
