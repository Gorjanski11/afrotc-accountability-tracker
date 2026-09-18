# Borinkeneers Accountability Tracker

PT/LLAB/FM attendance tracking for the detachment. A standalone site -- same Firebase
project/database as [afrotc-training-tracker](https://github.com/Gorjanski11/afrotc-training-tracker)
(the "TO's" site), but a separate deployment, separate repo, no login on either.

## Why one Firebase project, two sites

This site reads and writes the **same** `cadets` roster and `pmtEvents` calendar as the TO's
site -- so a cadet or a PMT never has to be entered twice, and the two sites can never drift out
of sync with each other. It owns its own `attendance`, `extraEvents`, `preAccountability`, and
`extraEventAttendance` collections.

No authentication, by design -- same tradeoff as the TO's site: anyone with the link can view and
edit everything. See `firestore.rules` in the TO's site's repo (shared rules, same project).

## Status

Built so far: Roster (extended with Class/Flight/Group/Position on top of the shared cadet
record), Events (PMTs + Extra Events, with Training Week conflict flagging), Post-Accountability
entry (the P/L/A/AE/PE grid), and a Dashboard with computed Standing per cadet and the Section 7
flags (missing accountability, TW conflicts, recently deactivated, stale repositions).

Not yet built: Pre-Accountability entry UI (the domain logic for "window closed with nothing
recorded" already works against an always-empty collection), the four reporting views (trend /
comparison / distribution / master table), Extra Event attendee-list UI, and the email
notifications (Resend + a Cloud Function) for absence reminders and flag digests.

## Local development

```sh
npm install
npm run dev
```

Talks to production Firestore directly unless `VITE_USE_FIREBASE_EMULATOR=true` is set (see
`src/lib/firebase.ts`) -- be careful with writes during local testing, same as the TO's site.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to
`main`. Requires the repo's Settings → Pages → Source set to "GitHub Actions", and
`vite.config.ts`'s `base` kept in sync with the repo name if it's ever renamed.
