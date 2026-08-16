# FlyBye

Meet verified travelers at your airport — Flutter + Supabase + RevenueCat.

## What's in this repo

```
.
├── lib/                     # Flutter app
│   ├── core/                # theme, router, env, Supabase providers
│   └── features/
│       ├── auth/            # landing, sign-in, sign-up, password reset, onboarding
│       ├── flight/          # airport autocomplete, departure entry
│       ├── discover/        # swipe deck, mutual-match detection
│       ├── matches/         # matches list, realtime chat
│       ├── profile/         # profile, settings, report/block sheet
│       └── subscription/    # RevenueCat paywall + tier service
├── supabase/
│   ├── migrations/          # init schema, RLS, RPCs, storage + realtime
│   ├── seed/airports_seed.sql
│   └── functions/revenuecat-webhook/    # Deno edge function
├── brand/logos/             # SVG/PNG/JPEG logo set
├── ios/Runner/Info.plist.snippet.xml
├── android/app/src/main/AndroidManifest.snippet.xml
├── store-listings.md        # App Store / Play copy
├── privacy-policy.html      # ready to host at flybye.app/privacy
├── TESTFLIGHT_CHECKLIST.md  # step-by-step path to TestFlight
├── deep_link_setup.md
├── supabase_reset_email_template.html
└── .env / .env.example
```

## Quick start

```bash
# 1. Install deps
flutter pub get

# 2. Create iOS/Android project shells (one-time)
flutter create --platforms=ios,android --org app.flybye --project-name flybye .

# 3. Apply iOS / Android config snippets
#    See ios/Runner/Info.plist.snippet.xml
#    See android/app/src/main/AndroidManifest.snippet.xml

# 4. Push the Supabase backend
supabase link --project-ref rxipszdcbvrevuyqpncq
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed/airports_seed.sql
supabase functions deploy revenuecat-webhook

# 5. Run on a device
flutter run
```

`TESTFLIGHT_CHECKLIST.md` is the full path to first build. `supabase/README.md` has backend setup detail.

## Architecture

**State**: Riverpod everywhere. `core/supabase_providers.dart` exposes the Supabase client + auth stream; feature folders own their own repos and providers.

**Routing**: `go_router` with an auth-aware redirect in `core/router.dart`. Bottom-nav shell hosts Discover / Matches / Profile.

**Realtime**: chat uses `client.from('messages').stream()` filtered by `match_id`. Receipt stamping is a SECURITY DEFINER RPC that no-ops for non–First Class users.

**Subscriptions**: client buys via `purchases_flutter` → RevenueCat → webhook → `subscriptions` table. Server-side gating reads from that table (don't trust the client). `discover_at_airport` ranks First Class > Regular > Standby.

**Verification (v1)**: signup uploads a selfie to the private `verifications` bucket; the row in `verification_requests` defaults to `pending`. Approving via SQL flips `profiles.is_verified = true` via trigger. Replace with Stripe Identity in v1.1.

**Safety**: every user can report + block. Blocks are bidirectional in RLS — a blocked user disappears from both feeds. Reports land in the `reports` table for human review.

## Where each Apple/Google requirement is handled

| Requirement | Location |
|---|---|
| 18+ gate | `profiles.birthdate` check + sign-up date picker `firstDate: now - 18y` |
| Reporting (App Store guideline 1.2) | `lib/features/profile/widgets/report_block_sheet.dart` |
| Blocking | Same sheet → writes to `blocks` table |
| Account deletion | `settings_screen.dart` (v1: support email → v1.1: in-app via RPC) |
| Privacy policy URL | `privacy-policy.html`, host at `flybye.app/privacy` |
| Camera/photo permission strings | `ios/Runner/Info.plist.snippet.xml` |
| Auto-renew disclosure | `paywall_screen.dart` benefit list (add explicit text before submission) |
| Encryption export compliance | `ITSAppUsesNonExemptEncryption=false` in Info.plist snippet |

## What's still needed before submission

- [ ] Run `flutter create` to generate `ios/` and `android/` directories (see TESTFLIGHT_CHECKLIST step 1)
- [ ] Apply Info.plist + AndroidManifest snippets
- [ ] Apple Developer account + bundle ID `app.flybye.ios`
- [ ] RevenueCat account + entitlements + iOS/Android API keys → `.env`
- [ ] Host privacy policy + create `flybye.app/support` page
- [ ] Capture real screenshots from a running build (1290×2796 for App Store, 1080×1920 for Play)
- [ ] Push schema + seed + edge function to Supabase
- [ ] Add `flybye://reset-password` to Supabase Auth redirect URLs
- [ ] Paste reset email template into Supabase Auth settings

## Known follow-ups for v1.1

- Push notifications (FCM + APNs)
- Stripe Identity for real KYC instead of manual selfie review
- In-app account deletion RPC
- Voice messages
- Photo messages in chat
- Profile photo carousel (the schema already supports `photos: text[]`, the UI shows only the first one)
- Geofence "you're at the airport" detection so users don't have to manually add a flight
