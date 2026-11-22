---
title: Admin sign-in is passkey or email+password; lib/auth.ts maps /change-password to a password session
author: 0xsoydev
date: 2026-11-22
branch: main
cost: { minutes: 1, tokens: 0 }
id: l-d81c4c39
scope: repo
status: active
src: agent
touches:
  - lib/auth.ts
  - scripts/seed-staff.ts
---

## Decided
`lib/auth.ts` enables Better Auth email+password with sign-up off and drops the email-code plugin (email is not configured). `authMethodFor` maps `/passkey/verify-authentication` to `passkey` and both `/sign-in/email` and `/change-password` to `password`; `requireRole` accepts either and sends `user.mustChangePassword` users to `app/admin/password`. `scripts/seed-staff.ts --temp-password` writes the credential `account` row with `hashPassword` from `better-auth/crypto`.

## Tried and ruled out
Leaving `/change-password` unmapped: with `revokeOtherSessions: true` Better Auth issues a new session through that path, which would be `unknown` and lock the admin out right after changing the password.

## Watch out
Better Auth rate-limits sign-in to 3 attempts per 10 seconds, so browser tests must wait between sign-ins. Hints inside a `<label>` become part of the input's accessible name; keep hints outside the label (as in `Field` in `product-editor.tsx`).
