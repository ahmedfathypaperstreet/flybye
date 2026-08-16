# FlyBye Technical Documentation

Last reviewed: 2026-07-05

This workspace contains two separate applications:

- `flybye`: Flutter mobile app for iOS and Android.
- `flybywebapp`: Vite React web app. The user-facing name is also FlyBye. The directory name is `flybywebapp`, even though it may be referred to casually as `flywebapp`.

The two apps share product concepts, but they are not currently the same codebase and they do not use the same Supabase schema. Treat them as two independent repos unless you intentionally plan a backend consolidation.

## Workspace Map

```text
/Users/ahmedfathy/Desktop/Fly
  flybye/        Flutter mobile repo
  flybywebapp/  React/Vite web repo
```

Both child folders are their own git repositories. The root folder is not a git repository.

At the time of review:

- Both child repos had clean working trees.
- `flybye/.dart_tool` was absent, so Flutter dependencies had not been fetched locally.
- `flybywebapp/node_modules` was absent, so Node dependencies had not been installed locally.
- No test/build commands were run because dependencies were not installed and the task was documentation/investigation.

## Executive Summary

`flybye` is closer to a store-submission mobile MVP. It has Flutter screens, Supabase migrations, RLS, storage buckets, Deno Edge Functions, Codemagic CI, App Review notes, TestFlight docs, and release notes. It uses a mobile-oriented schema where `profiles.id` is the auth user id, `flights` is one active airport presence per user, swipes create mutual matches, and chat streams messages in realtime.

`flybywebapp` is a Lovable-generated Vite React app with a marketing landing page and a usable authenticated web experience. It has richer web profile fields, flight itineraries, request/accept matches, chat polling, offline IndexedDB caching, a PWA service worker, a terminal map using MapLibre/OpenStreetMap, and Supabase email queue infrastructure. Its verification UI is partly aspirational: the UI expects a `start-verification` Edge Function and verification statuses that do not match the current SQL constraint.

The most important onboarding warning: do not point both apps at the same database without deliberate migration work. Their schemas differ in incompatible ways.

## Cross-App Differences

| Area | `flybye` mobile | `flybywebapp` web |
|---|---|---|
| Frontend | Flutter/Dart | React/TypeScript/Vite |
| Main state | Riverpod | React state, React Query provider, hooks |
| Auth | Supabase Flutter PKCE | Supabase JS plus Lovable OAuth wrapper |
| Profile key | `profiles.id` is `auth.users.id` | `profiles.id` is separate UUID, `profiles.user_id` is `auth.users.id` |
| Flight model | One active flight/presence per user, `airport_iata`, `active_until` | Multiple itinerary rows, departure/arrival/layover fields |
| Discover model | `discover_at_airport` RPC returns active users at same airport | Client queries `profiles_public`, filters, then fetches candidate flights |
| Matching | `swipes` table plus trigger creates `matches` on mutual like | `matches` rows are pending requests, accepted/declined by target |
| Messages | `body`, `read_at`, Supabase realtime stream | `content`, polling every 3 seconds, offline queue |
| Verification | `verification_requests` plus private `verifications` bucket | `profiles.verification_status`, private `id-documents` bucket, missing Persona kickoff function |
| Subscriptions | Supabase `subscriptions`; RevenueCat client currently stubbed | No subscription implementation found |
| Backend project hints | Docs mention project ref `rxipszdcbvrevuyqpncq` | `supabase/config.toml` project id `nqgpciewfajrcingdlgl` |

# Mobile App: `flybye`

## Purpose

`flybye` is a Flutter app for verified airport travelers to add a current flight, discover other travelers at that airport, match by mutual likes, and chat. It is built as a social/dating-style mobile MVP with App Store review preparation already in the repo.

## Technology Stack

- Flutter SDK: `>=3.22.0`
- Dart SDK: `>=3.4.0 <4.0.0`
- Supabase: `supabase_flutter`
- State management: `flutter_riverpod`
- Routing: `go_router`
- UI: Material 3, custom theme, Google Fonts, cached images, SVG support
- Media: `image_picker`, `permission_handler`
- Utilities: `intl`, `uuid`, `url_launcher`, `flutter_dotenv`
- RevenueCat: intentionally commented out/stubbed for v1.0

Important manifest files:

- `flybye/pubspec.yaml`
- `flybye/lib/main.dart`
- `flybye/lib/core/router.dart`
- `flybye/supabase/migrations/*.sql`
- `flybye/codemagic.yaml`

## Local Setup

Create `flybye/.env` from `flybye/.env.example`:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxx
REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxx
```

Install dependencies:

```bash
cd /Users/ahmedfathy/Desktop/Fly/flybye
flutter pub get
```

Run locally:

```bash
flutter run
```

Useful checks:

```bash
flutter analyze
flutter test
flutter build ipa --release
flutter build appbundle --release
```

The current test file is only a placeholder sanity test.

## App Boot

`lib/main.dart` performs this startup sequence:

1. Ensures Flutter bindings are initialized.
2. Loads `.env` using `flutter_dotenv`.
3. Initializes Supabase with URL, anon key, and PKCE auth.
4. Reads the RevenueCat key but does not configure RevenueCat because IAP is stubbed.
5. If boot fails, renders a `_BootErrorApp`.
6. Otherwise renders `ProviderScope` and `FlyByeApp`.

The app defines both light and dark themes, but `themeMode` is pinned to `ThemeMode.light`. Existing docs explain this was done because dark-mode devices made some in-app screens render as blank/invisible.

## Routing

Routes are defined in `lib/core/router.dart`.

| Route | Screen | Notes |
|---|---|---|
| `/` | Landing | Public |
| `/sign-in` | Sign in | Public |
| `/sign-up` | Sign up | Public |
| `/forgot-password` | Forgot password | Public |
| `/reset-password` | Reset password | Public even when signed in redirect logic runs |
| `/onboarding` | Profile setup | Requires auth |
| `/flight` | Flight entry | Requires auth |
| `/paywall` | Paywall placeholder | Requires auth |
| `/discover` | Discover tab | Bottom-nav shell |
| `/matches` | Matches tab | Bottom-nav shell |
| `/profile` | Profile tab | Bottom-nav shell |
| `/chat/:matchId` | Realtime chat | Requires auth |
| `/settings` | Settings | Requires auth |

The auth-aware redirect sends unauthenticated users back to `/` and sends signed-in users away from auth screens to `/discover`, except `/reset-password`.

## Feature Modules

```text
lib/core
  env.dart
  router.dart
  shell.dart
  supabase_providers.dart
  theme.dart

lib/features/auth
  screens
  services/auth_service.dart

lib/features/flight
  screens/flight_entry_screen.dart

lib/features/discover
  data/discover_repo.dart
  screens/discover_screen.dart

lib/features/matches
  data/match_repo.dart
  screens/matches_screen.dart
  screens/chat_screen.dart

lib/features/profile
  data/profile_repo.dart
  screens/profile_screen.dart
  screens/settings_screen.dart
  widgets/report_block_sheet.dart

lib/features/subscription
  data/subscription_service.dart
  screens/paywall_screen.dart
```

## Auth Flow

`AuthService` is a thin Supabase wrapper for:

- `signUp(email, password, displayName, birthdate)`
- `signIn(email, password)`
- `signOut()`
- `sendPasswordResetEmail(email)`
- `updatePassword(newPassword)`

Sign-up collects first name, last name, email, password, and birthdate. The date picker only allows birthdates at least 18 years ago. The database also enforces this with `profiles_age_18_plus`.

Password reset uses:

```text
flybye://reset-password
```

Platform deep link setup exists in:

- `ios/Runner/Info.plist`
- `android/app/src/main/AndroidManifest.xml`
- `deep_link_setup.md`

Important note: `AuthService.listenForPasswordRecovery()` exists, but I did not find it wired in `main.dart` or a root widget. The app may still handle deep links through Supabase Flutter and GoRouter, but the full reset flow should be device-tested.

## Onboarding Flow

`OnboardingScreen` requires:

- Profile photo from gallery.
- Verification selfie from camera.
- Optional bio.
- Vibe tags.

Uploads:

- Profile photo goes to Supabase Storage bucket `avatars`.
- Selfie goes to private bucket `verifications`.

Then the screen:

- Updates `profiles.bio`, `profiles.vibe_tags`, and `profiles.photos`.
- Upserts `verification_requests` with `status = pending`.
- Navigates to `/flight`.

## Flight Flow

`FlightEntryScreen` lets the user:

- Search airports from `airports` by IATA, city, or name.
- Enter an optional flight number.
- Call the `flight-lookup` Edge Function to auto-fill the origin and departure.
- Pick departure date/time.

Saving a flight:

- Deletes any existing `flights` row for the current user.
- Inserts a new `flights` row.
- Sets `active_until` to the departure time.

The database also enforces one flight per user with a unique index.

## Discover Flow

`DiscoverScreen` first loads the current user's active flight from `myActiveFlightProvider`. If no active flight exists, the user is prompted to add one.

If a flight exists:

1. `discoverFeedProvider(iata)` calls the `discover_at_airport` RPC.
2. The RPC returns active, non-blocked, non-banned, not-yet-swiped profiles at that airport.
3. Cards are ranked by tier: `first_class`, then `regular`, then `standby`.
4. Users can swipe by buttons or horizontal gesture.
5. Likes and passes insert into `swipes`.
6. A database trigger creates a match if both users liked each other.

Discover cards also include a report/block menu for App Store UGC compliance.

## Matches And Chat

`MatchRepo.listMatches()`:

- Fetches all matches where the current user is either `user_a_id` or `user_b_id`.
- Fetches the other user's profile separately.
- Fetches last messages and maps them per match.

`ChatScreen`:

- Loads the other participant name.
- Streams messages with `client.from('messages').stream(primaryKey: ['id'])`.
- Sends text messages into `messages`.
- Calls `mark_message_read` best-effort for recent unread messages from the other participant.

The `mark_message_read` RPC silently no-ops unless the reader is a First Class subscriber.

## Profile And Settings

`ProfileScreen` shows:

- Avatar from the first path in `profiles.photos`.
- Display name.
- Verification badge or "Verification pending".
- Bio and vibe tags.
- Upgrade subscription button.

`SettingsScreen` includes:

- Change password.
- Update flight.
- Support URL.
- Privacy URL.
- Sign out.
- Delete account prompt.

Account deletion is not automated. It currently tells the user to email `support@flybye.app`. Existing docs mark an in-app `delete_self` RPC as a v1.1 requirement.

## Subscriptions

The mobile app has subscription schema and webhook code, but the Flutter RevenueCat SDK is disabled for v1.0.

Current behavior:

- `SubscriptionService.currentTier()` always returns `standby`.
- `restore()` is a no-op.
- `myTierProvider` still reads `get_my_subscription_tier()` from Supabase.
- `PaywallScreen` says subscriptions are coming soon.

`REVENUECAT_REENABLE.md` documents how to restore `purchases_flutter` with a newer SDK and wire RevenueCat identity to the Supabase user id. The critical contract is that RevenueCat `app_user_id` must equal `auth.users.id`.

## Mobile Backend Schema

The mobile backend lives under `flybye/supabase`.

Core migrations:

- `20260505000001_init_schema.sql`
- `20260505000002_rls_policies.sql`
- `20260505000003_rpc_helpers.sql`
- `20260505000004_storage_realtime.sql`

Main tables:

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user. Stores name, bio, birthdate, photos, vibes, verification and ban flags. |
| `airports` | Static airport reference data. |
| `flights` | Current airport presence; one row per user. |
| `swipes` | Like/pass events. Unique per swiper/swipee pair. |
| `matches` | Canonical user pair created from mutual likes. |
| `messages` | Match chat messages, optional `read_at`. |
| `blocks` | Bidirectional feed filtering is enforced in RLS/RPC logic. |
| `reports` | Moderation queue. |
| `subscriptions` | RevenueCat-synced entitlement state. |
| `verification_requests` | Manual selfie review queue. |

Important triggers:

- `handle_new_user`: creates a profile shell when an auth user is created.
- `tg_set_updated_at`: maintains `updated_at`.
- `tg_create_match_on_mutual_like`: inserts into `matches` after a mutual like.
- `tg_bump_match_last_message`: updates `matches.last_message_at`.
- `tg_apply_verification_decision`: updates `profiles.is_verified` when verification status changes.

Important RPCs:

| RPC | Purpose |
|---|---|
| `discover_at_airport(p_airport_iata, p_limit)` | Returns ranked discover candidates. |
| `mark_message_read(p_message_id)` | Stamps `read_at` for First Class readers only. |
| `get_my_subscription_tier()` | Returns current active tier or `standby`. |
| `touch_last_seen()` | Updates `profiles.last_seen_at`. I did not find a Flutter call to this RPC. |

Storage buckets:

| Bucket | Public | Purpose |
|---|---:|---|
| `avatars` | Yes | Profile images. Write access restricted to the user's own folder. |
| `verifications` | No | Verification selfies. Owner can insert/read own object; admins use service role. |

Realtime:

- `messages` and `matches` are added to `supabase_realtime`.
- The Flutter app uses realtime for chat messages.

## Mobile Edge Functions

### `revenuecat-webhook`

Path:

```text
flybye/supabase/functions/revenuecat-webhook/index.ts
```

Purpose:

- Receives RevenueCat webhook events.
- Authenticates with `Authorization: Bearer <RC_WEBHOOK_SECRET>`.
- Uses service role to upsert the `subscriptions` table.
- Maps entitlement ids:
  - `first_class` to `first_class`
  - `regular` to `regular`
  - otherwise `standby`

Required secrets:

- `RC_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### `flight-lookup`

Path:

```text
flybye/supabase/functions/flight-lookup/index.ts
```

Purpose:

- Accepts a flight number such as `AA123`.
- Calls AviationStack.
- Returns origin IATA and scheduled departure time.

Required secret:

- `AVIATIONSTACK_KEY`

The function assumes Supabase Edge Function JWT verification remains enabled.

## Mobile Operator Scripts

`flybye/scripts` contains:

- `seed_demo_users.ts`: creates reviewer/demo users with avatars, active flights, and approved verifications.
- `admin.sh`: described as a helper for verification queue and reports.

Required script env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- For `admin.sh`, `DATABASE_URL`

The seeded reviewer login is documented in repo files. Do not put service role keys in source control.

## Mobile CI And Release

`codemagic.yaml` defines:

- `ios-testflight`: builds IPA and can publish to TestFlight.
- `android-googleplay`: builds AAB and can publish to Google Play internal track.

Important CI behavior:

- CI recreates `.env` from Codemagic variables.
- iOS signing uses Codemagic managed signing for bundle id `app.flybye.flybye`.
- Android release build currently signs with debug keys in `android/app/build.gradle.kts`; production Play release needs a real keystore.

Release and review docs:

- `PUBLISH_GUIDE.md` is marked as the current guide and supersedes older checklist docs where they conflict.
- `TESTFLIGHT_CHECKLIST.md` and `HANDOFF.md` contain useful history but some bundle id details are outdated.
- `APP_REVIEW_NOTES.md` has reviewer notes.
- `REVENUECAT_REENABLE.md` explains the v1.1 IAP plan.

## Mobile Important Notes

1. Actual bundle/application id is `app.flybye.flybye`. Older docs mention `app.flybye.ios`; the newer publish guide says to use the actual generated id unless intentionally changed.
2. IAP is deliberately disabled. Do not submit subscription products for the current free v1.0 build unless RevenueCat is re-enabled and device-tested.
3. `touch_last_seen()` exists but appears unused by the Flutter client.
4. Password recovery listener helper exists but appears unwired. Test reset links on a real device.
5. Account deletion is not automated. Store review risk is called out in existing docs.
6. Android release signing still uses debug signing.
7. `pubspec.lock` is gitignored. For Flutter apps, committing `pubspec.lock` is often useful for reproducible application builds.
8. The only Flutter test is a placeholder.

# Web App: `flybywebapp`

## Purpose

`flybywebapp` is a web/PWA version of FlyBye. It includes a marketing landing page and authenticated app routes for profiles, flight itineraries, discovery, match requests, chat, terminal maps, ID verification UI, location sharing, and legal pages.

The repo appears to originate from Lovable. `README.md` is still a placeholder, so this document is the primary technical onboarding source.

## Technology Stack

- React 18
- TypeScript
- Vite
- React Router
- Supabase JS
- Lovable cloud auth wrapper for OAuth
- Tailwind CSS
- shadcn/Radix UI components
- Framer Motion
- Lucide icons
- MapLibre GL
- IndexedDB via `idb`
- PWA support via `vite-plugin-pwa`
- Capacitor dependencies and config
- Vitest and Playwright configuration

Important files:

- `flybywebapp/package.json`
- `flybywebapp/vite.config.ts`
- `flybywebapp/src/App.tsx`
- `flybywebapp/src/contexts/AuthContext.tsx`
- `flybywebapp/src/integrations/supabase/client.ts`
- `flybywebapp/supabase/migrations/*.sql`
- `flybywebapp/supabase/functions/*`

## Local Setup

The app expects a local `.env` with:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The repo has a local `.env` file, but there is no `.env.example`. Do not print or commit local env values.

Install dependencies:

```bash
cd /Users/ahmedfathy/Desktop/Fly/flybywebapp
npm install
```

Run development server:

```bash
npm run dev
```

By default Vite listens on:

```text
http://localhost:8080
```

Other scripts:

```bash
npm run build
npm run build:dev
npm run lint
npm run preview
npm run test
npm run test:watch
```

The repo has both `package-lock.json` and Bun lockfiles. Since scripts and lockfile are npm-oriented, standardize on npm unless the team intentionally switches package managers.

## App Shell And Routes

`src/App.tsx` wraps the app with:

- `QueryClientProvider`
- Tooltip provider
- Toast providers
- `ConnectionBanner`
- `BrowserRouter`
- `AuthProvider`
- Routes
- Global `Footer`

Routes:

| Route | Page | Notes |
|---|---|---|
| `/` | Landing page | Marketing home |
| `/login` | Login | Email/password plus OAuth buttons |
| `/signup` | Signup | Display name, email, password |
| `/forgot-password` | Forgot password | Supabase reset email |
| `/reset-password` | Reset password | Requires recovery token in URL hash |
| `/discover` | Discover | Auth-aware, browse/sign-in gate |
| `/profile` | Profile edit and verification | Requires auth |
| `/flights` | Flight itinerary manager | Requires auth |
| `/matches` | Match requests and accepted matches | Requires auth |
| `/chat/:matchId` | Chat | Requires accepted match |
| `/terms` | Terms |
| `/privacy` | Privacy |
| `/community-guidelines` | Guidelines |
| `/acceptable-use` | Acceptable use |
| `/cookie-policy` | Cookies |
| `/safety-tips` | Safety |
| `/law-enforcement` | Law enforcement |
| `*` | Not found |

There is no route guard component. Individual pages redirect unauthenticated users as needed.

## Auth

`AuthContext`:

- Subscribes to `supabase.auth.onAuthStateChange`.
- Calls `supabase.auth.getSession()` on mount.
- Exposes `session`, `user`, `loading`, and `signOut`.

Email/password auth:

- Signup calls `supabase.auth.signUp`.
- Login calls `supabase.auth.signInWithPassword`.
- Reset calls `supabase.auth.resetPasswordForEmail`.
- Password update calls `supabase.auth.updateUser`.

OAuth:

- `SocialButtons` uses `@lovable.dev/cloud-auth-js`.
- The wrapper sets Supabase session tokens if the OAuth flow does not redirect.

Important compliance note: Signup does not collect birthdate or record an 18+ attestation. A backend `attestations` table exists, but I did not find UI writing to it.

## Landing Page

`Index.tsx` is a polished marketing page with:

- Hero background image.
- Mock profile cards.
- Feature sections.
- Stats.
- Testimonials.
- Calls to `/discover` and signup flows.

`index.html` has duplicated title/description tags: one FlyBye set and one Lovable placeholder set. Clean this before production SEO work.

## Profile

`Profile.tsx` reads and updates `profiles` by `user_id`.

Editable fields:

- `display_name`
- `bio`
- `avatar_url`
- `home_airport`
- `travel_style`
- `connection_mode`
- `gender`
- `gender_preference`
- `interests`

Profile photos are currently entered as a pasted image URL. There is no avatar upload flow in this web app.

## Verification

Verification is split across:

- `useVerificationStatus`
- `VerificationStatusCard`
- `IDUploadCard`
- `profiles` table verification columns
- `id-documents` storage bucket

Intended behavior:

- Users can verify with Persona through a `start-verification` Edge Function.
- Users can manually upload front of ID, back of ID, and selfie to `id-documents`.
- Discover lets unverified users browse but blocks matching/messaging actions.

Current problems found:

1. No `supabase/functions/start-verification` function exists in the repo.
2. `useVerificationStatus` expects states: `none`, `queued`, `pending`, `processing`, `verified`, `failed`, `expired`.
3. SQL constrains `profiles.verification_status` to: `none`, `pending`, `approved`, `declined`, `needs_review`, `expired`.
4. `IDUploadCard` writes `verification_status = "processing"`, which the database constraint would reject unless production has a later manual change not present in migrations.
5. `Discover` checks `verifyState === "verified"`, but SQL appears to model approval as `approved` plus `profiles.verified = true`.

This should be fixed before relying on verification gating.

## Flights

`Flights.tsx` manages many flight rows per user.

Fields:

- `flight_number`
- `departure_airport`
- `arrival_airport`
- `departure_time`
- `arrival_time`
- optional `layover_airport`
- optional `layover_duration_minutes`

The page supports adding and deleting flights. It does not call any flight lookup/enrichment function.

## Discover

`Discover.tsx` uses:

- `useTravelers`
- `useNearbyFlyers`
- `useVerificationStatus`
- `SwipeCard`
- `TerminalMap`

`useTravelers`:

1. Fetches current user's profile for connection mode and gender preference.
2. Fetches match rows where current user is requester to exclude already-swiped targets.
3. Queries `profiles_public`.
4. Filters by connection mode and gender preference.
5. Fetches future flights for candidate users.
6. Maps candidates into `TravelerProfile`.
7. Caches the deck in IndexedDB.

Right swipe:

- Inserts a `matches` row with `status = pending`.
- If offline, queues the mutation and shows a toast.

Left swipe:

- Removes the card locally without writing a pass record.

Undo:

- Deletes the pending match row if it exists, then restores the last card.

Verification gate:

- Unverified users can browse.
- Swiping right/left through guarded controls is blocked until verification state is `verified`.

Note: Because the web backend uses request/accept matches, this is not the same model as the mobile app's mutual-like `swipes` table.

## Matches

`Matches.tsx`:

- Fetches `matches` where user is requester or target and status is `pending` or `accepted`.
- Fetches public profiles for the other users.
- Splits pending and accepted matches into tabs.
- Allows the target user to accept or decline a pending request.
- Links accepted matches to chat.

Only the target can update status according to RLS.

## Chat

`Chat.tsx`:

- Requires an accepted match.
- Fetches match info and the other profile.
- Hydrates cached messages from IndexedDB.
- Fetches messages from Supabase.
- Polls for messages every 3 seconds when online.
- Optimistically appends outgoing messages.
- Queues outgoing messages offline.
- Includes `LocationShareCard` at the top of the conversation.

The web app does not currently use Supabase realtime for chat. One migration explicitly removes `messages` from realtime publication to prevent unauthorized subscriptions.

## Location Sharing

`LocationShareCard` lets users share terminal/zone/note with one accepted match.

Data table:

- `location_shares`

Behavior:

- Owner manages their own share row.
- Accepted matches can view active shares.
- Client polls the other user's share every 15 seconds.
- Heartbeat updates `last_seen_at` every 60 seconds.
- The app attempts to disable sharing when the document becomes hidden.

## Terminal Map And POIs

`TerminalMap` uses:

- MapLibre GL.
- OpenStreetMap raster tiles.
- `airport-pois` Supabase Edge Function.
- Client-side IndexedDB POI cache.

`airport-pois`:

- Looks up airport data in `airports`.
- Reads/writes `airport_pois_cache`.
- Uses Overpass API to fetch food, lounges, restrooms, shops, and info points.
- Caches POIs for 7 days server-side.
- Falls back to stale cache if Overpass is unavailable.

## Offline And PWA

Offline pieces:

- `useOnlineStatus` watches browser online/offline events.
- `offlineCache.ts` wraps IndexedDB.
- `syncQueue.ts` queues and flushes mutations.
- `ConnectionBanner` displays online/offline/syncing state and flushes queue on reconnect.

IndexedDB database:

```text
flybye-offline
  kv
  travelers
  pois
  matches
  messages
  mutations
```

Queued mutation kinds:

- `swipe`
- `message`
- `flight-upsert`
- `flight-delete`
- `location-share`
- `edge-function`

PWA:

- Configured in `vite.config.ts` using `vite-plugin-pwa`.
- Service worker registration is guarded to avoid Lovable preview iframes and dev mode.
- Runtime caches OSM tiles, airport POIs, and images.
- PWA manifest icons currently point to `/placeholder.svg`, which should be replaced before production.

## Capacitor

`capacitor.config.ts` exists and uses:

```text
appId: app.lovable.d8cae1a63f5846379ceb766bb7e1e0cc
appName: FlyBye
webDir: dist
server.url: https://d8cae1a6-3f58-4637-9ceb-766bb7e1e0cc.lovableproject.com?forceHideBadge=true
```

This is a Lovable app id and remote server URL. If this web app is packaged as a native Capacitor app, change the app id, review the remote server strategy, and align signing/deep links/store metadata.

## Web Backend Schema

Supabase config:

```text
flybywebapp/supabase/config.toml
project_id = "nqgpciewfajrcingdlgl"
```

Main tables:

| Table | Purpose |
|---|---|
| `profiles` | User profile, preferences, verification fields. Keyed by `user_id`. |
| `flights` | User itineraries. |
| `matches` | Pending/accepted/declined/expired match requests. |
| `messages` | Accepted-match messages. |
| `location_shares` | Active terminal/zone sharing visible to accepted matches. |
| `attestations` | Legal/age/safety/verification consent ledger, service-role managed. |
| `airports` | Airport reference data with coordinates and bounding boxes. |
| `airport_pois_cache` | Cached Overpass POI payloads. |
| `email_send_log` | Email send audit log. |
| `email_send_state` | Email queue processing config and rate-limit state. |
| `suppressed_emails` | Unsubscribed/bounced/complained addresses. |
| `email_unsubscribe_tokens` | Unsubscribe token records. |

Views and functions:

| Object | Purpose |
|---|---|
| `profiles_public` | Public-safe profile view excluding verification details. |
| `get_my_profile()` | Security definer function for current user's full profile. |
| `user_shares_airport(text[])` | Checks whether current user has an upcoming flight touching any given airport. |
| `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` | PGMQ wrapper functions restricted to service role. |

Storage:

| Bucket | Public | Purpose |
|---|---:|---|
| `id-documents` | No | Manual ID upload documents under `{user_id}/...`. |

RLS highlights:

- Owners can manage their own profile rows.
- Other users should read `profiles_public`, not base `profiles`.
- Flights are visible to owner and, in the latest privacy migration, users who share an airport with the current user.
- Matches are visible to requester or target.
- Match targets can accept/decline; requesters can delete own requests.
- Messages are visible/insertable only for accepted matches.
- Active location shares are visible only to accepted matches.
- ID documents are accessible only under the user's own storage folder.
- Email queue functions/tables are service-role oriented.

## Web Edge Functions

### `airport-pois`

Path:

```text
flybywebapp/supabase/functions/airport-pois/index.ts
```

Purpose:

- Provides terminal POIs for a requested IATA code.
- Uses service role.
- Reads `airports`.
- Uses `airport_pois_cache`.
- Calls Overpass API when cache is stale/missing.

### `process-email-queue`

Path:

```text
flybywebapp/supabase/functions/process-email-queue/index.ts
```

Purpose:

- Processes PGMQ email queues.
- Sends through `@lovable.dev/email-js`.
- Handles rate limits, retries, duplicate-send prevention, and DLQ moves.

Important behavior:

- `verify_jwt = true` in `supabase/config.toml`.
- Function also parses JWT claims and requires `role = service_role`.
- Requires `LOVABLE_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Optional `LOVABLE_SEND_URL` can override the send endpoint.

### Missing But Referenced: `start-verification`

The React verification UI calls:

```text
supabase.functions.invoke("start-verification")
```

No matching function exists in the repo. Implement or remove this path before enabling Persona verification.

## Web Important Notes

1. `README.md` is a placeholder.
2. There is no `.env.example`.
3. `index.html` contains duplicate title/description tags and Lovable placeholder metadata.
4. Verification status values are inconsistent between UI and SQL.
5. `start-verification` is referenced but missing.
6. `IDUploadCard` writes a status that the SQL constraint likely rejects.
7. Signup lacks an explicit age gate, while legal/compliance tables imply one is needed.
8. The `attestations` table exists but I did not find a UI or Edge Function writing to it.
9. Web lacks obvious report/block controls for profiles or chats. For a social/UGC product, this is a safety and review gap.
10. Web lacks obvious account deletion UI.
11. PWA manifest icons still use `placeholder.svg`.
12. Capacitor config uses a Lovable app id and hosted Lovable URL.
13. Legal pages reference `flybye.com` email/domain in places, while mobile docs use `flybye.app`.
14. The only Vitest test is a placeholder.
15. The final flight RLS policy may restrict discovery flight data to users sharing airports. Test Discover with users that have and do not have overlapping flights.

# Backend Consolidation Notes

If the goal is eventually to make mobile and web use one backend, plan a schema migration. The biggest incompatibilities are:

1. Profile primary key shape:
   - Mobile: `profiles.id = auth.users.id`
   - Web: `profiles.user_id = auth.users.id`, `profiles.id` is separate
2. Match lifecycle:
   - Mobile: swipes plus mutual-like trigger
   - Web: pending request, accepted/declined by target
3. Message columns:
   - Mobile: `body`, `read_at`
   - Web: `content`
4. Flight model:
   - Mobile: one active airport presence
   - Web: multiple full itinerary rows
5. Verification model:
   - Mobile: `verification_requests` table and `verifications` bucket
   - Web: `profiles.verification_status`, `id-documents` bucket, and planned Persona function
6. Storage:
   - Mobile avatars are storage paths in a public bucket
   - Web profile avatars are URL strings
7. Subscriptions:
   - Mobile has a server-side subscription table and webhook
   - Web has no matching subscription implementation

A safe consolidation path would be:

1. Decide the canonical product model for profiles, flights, matching, messages, verification, and subscriptions.
2. Create compatibility views/RPCs for one client while migrating the other.
3. Avoid direct table writes from clients where behavior differs; prefer RPCs for swipes/match requests, message send, verification state transitions, and account deletion.
4. Generate fresh Supabase types for the web app after every schema change.
5. Add integration tests for RLS-sensitive flows before moving users.

# Suggested First-Day Checklist For A New Developer

1. Read this document.
2. Read `flybye/PUBLISH_GUIDE.md` for the current mobile shipping plan.
3. Read both app manifests: `flybye/pubspec.yaml` and `flybywebapp/package.json`.
4. Create local env files from documented variable names.
5. Install dependencies in one app at a time.
6. Run static checks and placeholder tests.
7. For mobile, smoke test: sign up, onboarding, flight, discover, match, chat, report/block.
8. For web, smoke test: signup/login, profile edit, flight add, discover, match accept, chat, offline send, terminal map.
9. Fix web verification status/function mismatch before relying on verification.
10. Do not mix the two Supabase schemas without an explicit migration plan.

