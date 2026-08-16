# FlyBye — Unified Product Spec (Business Networking)

> Single source of truth for aligning the **web** (`flybye-webapp`) and **mobile** (`flybye`)
> apps onto one product, one backend, one design system.
> Status: **draft v0.1** — decisions locked on 2026-07-14, open sub-questions at the bottom.

## 1. Positioning
**FlyBye — the career network for people in transit.** Meet ID-verified professionals in your
terminal or lounge during layovers: networking, hiring, partnerships, mentorship. Not a dating app.

## 2. Locked decisions
| Decision | Choice |
|---|---|
| Connection model | **Open direct messaging** between verified users — no swipe, no accept gate |
| Visual identity | **Web's dark navy + blue** palette, shared by both apps |
| Monetization (v1) | **Free** — all features unlocked, no paywall |
| Design source of truth | **Web** — mobile is re-aligned to match web flows/copy |
| Feature parity | **Full** — mobile gets every web feature (live lounge presence, airport map + POIs, ID verification) |
| Verification method | **Government ID upload** → review → verified badge |
| Discovery axis | **Same airport, right now** (verified people whose layover overlaps yours) |
| Onboarding gate | **Browse first, verify to message** |
| Backend | Single shared Supabase project `pngjuliouszzhylkimsd` |
| Canonical schema base | **Web schema** (superset of features) + new business fields — *supersedes the earlier "Flutter schema" call, see §5* |

## 3. Core model
A user signs up → completes a professional profile → verifies identity → adds their current
flight/layover → sees other **verified** professionals at the same airport → **messages any of them
directly** → chats in real time. Verification is the trust gate: only verified users can message
and appear in Discover.

## 4. Shared screens (identical flow + copy on both platforms)
1. **Landing** (web) — marketing hero, business framing.
2. **Auth** — sign up, sign in, forgot password, reset password.
3. **Onboarding** — build profile → upload ID for verification → add current flight/layover.
4. **Discover** — list of verified professionals at your airport/terminal now; filter by
   networking intent and industry. Card shows: name, role · company, industry, intent, verified badge.
5. **Profile** — view others; edit your own (all business fields, photo, ID re-submit).
6. **Messages** — conversation list + real-time chat thread; report/block from the header.
7. **Flight/Layover** — add or update your current airport presence and layover window.
8. **Settings** — account, in-app account deletion, privacy links, sign out.

## 5. Canonical data model (on the shared project)
**Base = the web schema** (it already carries `connection_mode='open'`, ID-verification fields,
`location_shares`, `airport_pois_cache`). We extend it with real business fields and simplify the
connection model to open DMs. *This supersedes the earlier "push the Flutter migrations" plan — that
schema had swipes + subscription tiers + selfie verification and lacked location/POI/business data,
so basing on Flutter would mean rebuilding all the web features from scratch.*

Reality check found on 2026-07-14: the web "business" identity is currently **cosmetic only** —
persisted `profiles` columns are still travel/social (`interests[]`, `travel_style`, `gender`,
`gender_preference`, `home_airport`); the business fields live only in a UI mockup's TS types. So
business fields must be **added** to the DB regardless of base.

- **profiles** — keep web base; **add** business fields: `role/headline`, `company`, `industry`,
  `intent` (`hiring | partnerships | mentorship | networking`), `linkedin_url` (optional).
  **Remove/retire** dating fields: `gender`, `gender_preference`, `travel_style`, `interests`.
  Keep: `display_name`, `avatar_url`, `bio`, `airport_code`/`home_airport`, verification fields,
  `connection_mode` (fixed to `open`), `verified`.
- **airports** — reference data (must be **seeded** — currently empty).
- **flights** — active airport presence + layover window.
- **conversations** — thread between two verified users, created on first message *(open DM; no
  request/accept). Replaces the web `matches(requester,target,status)` request flow.*
- **messages** — realtime; read receipts.
- **blocks**, **reports** — safety + store compliance.
- **verification via ID** — `id-documents` bucket + review → `verified = true` *(needs the missing
  `start-verification`/review step built)*.
- **location_shares** — live lounge/terminal presence (kept, per full-parity).
- **airport_pois_cache** — terminal map + POIs (kept, per full-parity).
- ~~swipes~~, ~~subscriptions~~ — not in v1.

## 6. Verification (trust gate)
- Required to message and to be discoverable.
- Pending users may browse Discover (read-only) but see a "verify to connect" banner.
- Method: government-ID document upload → manual/automated review → `is_verified = true`.

## 7. Safety (required for app stores)
- Block from any profile and any chat (bidirectional).
- Report with reason categories → admin queue.
- Published contact + policies (privacy, terms, community guidelines) already exist on web.

## 8. Design system (shared)
Adopt the web tokens on both platforms:
- Background: deep navy `hsl(224 55% 8%)`
- Primary: blue `hsl(209 52% 52%)`
- Accent: steel blue `hsl(212 34% 72%)`
- Gradient: primary → accent
- Dark-mode first. Flutter theme retokenized to match (retire the cyan/light dating theme).

## 9. Platform notes
- **Web**: Vite/React PWA. The Capacitor "mobile" build currently loads a hosted Lovable URL —
  must be repointed to the local bundle before any native web build.
- **Mobile**: Flutter. Needs re-copy/re-theme to business framing + schema alignment + the
  release blockers from the audit (account deletion, password-reset wiring).

## 10. Open sub-questions (next round of discussion)
1. **Discovery axis** — only "at the same airport right now", or also "home airport / frequent
   flyers / upcoming trips overlap"?
2. **Lounge/terminal presence** — keep live location sharing ("who's in my lounge now")? Web has it.
3. **Airport map + POIs** — keep as a feature or drop for v1?
4. **Verification method** — government ID, or lighter LinkedIn-link verification, or both?
5. **Onboarding order** — must users verify before they can browse, or browse first then verify to message?
6. **Photos** — single headshot only, or a small gallery?
