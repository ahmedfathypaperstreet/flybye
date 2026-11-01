# FlyBye — Status & Critical Path

**Goal: Apple App Store this week + 100 testers in week 1.**

## Where we are

The app is **code-complete** for v1 plus the pre-submission UI fixes Apple cares about. Backend, IAP, demo seeds, flight lookup, and the App Review notes are all written.

## What's blocking the first build (must do, in order)

1. **Generate platform folders.** From the project root:
   ```bash
   flutter create --platforms=ios,android --org app.flybye --project-name flybye .
   flutter pub get
   ```
2. **Apply manifest snippets.** Paste the contents of `ios/Runner/Info.plist.snippet.xml` into `ios/Runner/Info.plist` (don't replace the file; merge into the top-level `<dict>`). Same for `android/app/src/main/AndroidManifest.snippet.xml`.
3. **Push the Supabase backend.**
   ```bash
   supabase link --project-ref pngjuliouszzhylkimsd
   supabase db push
   psql "$SUPABASE_DB_URL" -f supabase/seed/airports_seed.sql
   psql "$SUPABASE_DB_URL" -f supabase/admin/01_admin_views.sql
   ```
   Then in the dashboard: add `flybye://reset-password` to **Auth → Redirect URLs** and paste `supabase_reset_email_template.html` into **Auth → Email Templates → Reset Password**.
4. **Seed demo users.** From `scripts/`:
   ```bash
   cd scripts && npm install
   export SUPABASE_URL='https://pngjuliouszzhylkimsd.supabase.co'
   export SUPABASE_SERVICE_ROLE_KEY='<service-role-key from dashboard>'
   npx ts-node seed_demo_users.ts
   ```
   This creates `reviewer@flybye.app` + 5 demo profiles split between JFK and LAX with photos, active flights, and approved verifications. **Idempotent** — safe to re-run.
5. **Apple Developer enrollment** — $99/yr at developer.apple.com. Requires DUNS or Apple-issued ID.
6. **Bundle ID** `app.flybye.ios` registered in App Store Connect.
7. **First build to TestFlight Internal.** Follow `TESTFLIGHT_CHECKLIST.md`.

## What's blocking subscriptions (do anytime before the App Store submission)

- **RevenueCat account** + iOS app + entitlements `regular` and `first_class` + offerings.
- Drop the iOS API key into `.env` as `REVENUECAT_IOS_KEY`.
- Deploy the webhook:
  ```bash
  supabase functions deploy revenuecat-webhook
  supabase secrets set RC_WEBHOOK_SECRET="$(openssl rand -hex 32)"
  ```
  Paste the function URL + secret into RevenueCat → Integrations → Webhooks.
- App Store Connect → create the four subscription products (`flybye_regular_monthly`, `flybye_regular_annual`, `flybye_first_class_monthly`, `flybye_first_class_annual`).

You can submit for App Store review without IAP wired — Apple lets you add subscriptions to a later build. But the paywall needs to function for review, so wire RevenueCat before the **second** submission.

## What's blocking flight auto-fill (optional, skip if rushed)

- Sign up at aviationstack.com (free 100 calls/mo).
- `supabase secrets set AVIATIONSTACK_KEY=<key>`
- `supabase functions deploy flight-lookup`

## 100 testers — full plan in `TESTFLIGHT_100_USERS.md`

Quick version: ship to TestFlight Internal today (instant, 100-cap), iterate Tue–Wed, promote to External + public link Thu–Fri, recruit through personal network + travel subreddits + HN Show HN.

## Files added this round

```
scripts/seed_demo_users.ts          # 6 demo users, idempotent
scripts/package.json
scripts/README.md

supabase/functions/flight-lookup/   # AviationStack edge function
supabase/admin/01_admin_views.sql   # already there from earlier round

APP_REVIEW_NOTES.md                 # paste-into-ASC reviewer notes
TESTFLIGHT_100_USERS.md             # 100-user playbook
TESTFLIGHT_CHECKLIST.md             # original step-by-step

lib/features/subscription/screens/paywall_screen.dart  # +auto-renew block
lib/features/matches/screens/chat_screen.dart          # +report menu in header
lib/features/flight/screens/flight_entry_screen.dart   # +Auto-fill button
```

## Open follow-ups (not blocking ship)

- **In-app account deletion RPC** — Apple requires this. Acceptable to deflect to support email for v1, must ship in v1.1 within ~30 days of approval.
- **Push notifications** — deferred per scope.
- **Real KYC** (Stripe Identity) — selfie+manual review is fine until volume justifies the swap.
- **Photo carousel in profile** — schema supports `photos: text[]`, UI shows only the first photo. 1-day fix when you want it.
- **Geofence "you're at the airport"** — biggest UX upgrade for v1.x.
