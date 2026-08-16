# FlyBye — Publish Guide (current)

Single source of truth for shipping FlyBye, updated June 2026. Supersedes the older `TESTFLIGHT_CHECKLIST.md` / `HANDOFF.md` where they conflict. Order: **TestFlight → App Store → Google Play.**

---

## What changed this round (already done in the repo)

- **Flight entry screen fixed.** Root cause was dark mode: in-app screens are light-first, but the app followed the device theme and the dark theme is incomplete, so on a dark-mode iPhone the text rendered invisible ("blank" screen, couldn't pick an airport). Fix: app is now pinned to light mode (`themeMode: ThemeMode.light` in `main.dart`), the flight screen's hardcoded colors are now theme-aware, and airport search now handles errors + stale responses.
- **Report/block added to the discover deck card** (⋯ top-right) — Apple Guideline 1.2 needs this where users view others' content. Chat already had it.
- **Reviewer notes aligned to v1.0 reality** (`APP_REVIEW_NOTES.md`): the build is free, no active subscriptions.
- **Android `minSdk` pinned to 23** (Supabase Realtime requirement).
- **IAP intentionally deferred to v1.1.** `purchases_flutter` 8.x SIGKILLed on iOS 26; re-enable plan with 9.15.0 is in `REVENUECAT_REENABLE.md`. The first store build ships free — Apple allows adding subscriptions later.

## Config facts (verified against the actual project)

- **iOS/Android bundle id is `app.flybye.flybye`** (from `flutter create --org app.flybye --project-name flybye`). The older docs said `app.flybye.ios` — use the real value `app.flybye.flybye` everywhere (App Store Connect, RevenueCat later, etc.), or change it in Xcode if you prefer a different one.
- iOS `Info.plist` already has the 4 permission strings and the `flybye://` URL scheme.
- Android manifest already has INTERNET/CAMERA/media permissions and the `flybye://reset-password` deep link.
- Version is `0.1.0+1` (`pubspec.yaml`).

---

## Prerequisites (one-time, [you] at the keyboard)

- macOS + Xcode 15.4+, CocoaPods (`sudo gem install cocoapods`)
- Flutter 3.22+ on PATH (`flutter --version`)
- Apple Developer Program membership ($99/yr) under PaperStreet NY
- Privacy policy live at `https://flybye.app/privacy` and support page at `https://flybye.app/support` (HTML is in the repo: `privacy-policy.html`, `support.html`)

---

## A. Pre-flight build (do once, then reuse)

```bash
cd "/Users/paperii/Documents/Claude/Projects/FlyBye App"
flutter pub get
cd ios && pod install && cd ..
flutter analyze        # fix anything that surfaces — I couldn't run this in-sandbox
flutter run --release  # smoke test on a real iOS 26 device: sign up → onboarding → flight → discover → match → chat
```

Confirm on-device, in this order, that:
1. App boots (no crash).
2. Onboarding completes (photo + selfie upload).
3. **Flight screen lets you search an airport, pick it, set a time, and save** (this was the blocker).
4. Discover deck shows demo cards at JFK; the ⋯ on a card opens Report/Block.
5. Match → chat works; chat header ⋯ opens Report/Block.

---

## B. TestFlight

1. **Xcode signing.** Open `ios/Runner.xcworkspace` → Runner target → Signing & Capabilities → set your Team. Bundle id should read `app.flybye.flybye`. Set Version `0.1.0`, Build `1`.
2. **Build the archive:**
   ```bash
   flutter build ipa --release
   ```
3. **Upload:** `open build/ios/archive/Runner.xcarchive` → Xcode Organizer → Distribute App → App Store Connect → Upload. (Or `xcrun altool --upload-app -f build/ios/ipa/*.ipa -t ios -u <apple-id> -p <app-specific-password>`.)
4. Wait ~15–20 min for processing in App Store Connect → TestFlight.
5. **Internal testing:** add yourself + up to 100 internal testers (no review, instant).
6. **External testing:** create a public link group; first external build needs a short Beta App Review (usually < 24h). Use this link to recruit your 100 testers (playbook in `TESTFLIGHT_100_USERS.md`).

---

## C. App Store submission (after TestFlight looks good)

1. **App Store Connect → My Apps → +** : iOS, name "FlyBye" (fallback "FlyBye - Meet at Your Airport" if taken), primary language English (U.S.), bundle id `app.flybye.flybye`, SKU `flybye-ios-001`.
2. **App Information / listing:** use copy from `store-listings.md` (name, subtitle, keywords, description, support + privacy URLs).
3. **Screenshots:** 6.7" iPhone, 1290×2796. Capture from the running build (iOS Simulator ⌘+S). Make sure they match the real app.
4. **App Privacy:** fill the data-collection questionnaire (email, photos, user content, identifiers).
5. **Age rating:** 18+ (the app gates under-18 at signup).
6. **No subscriptions for this build** — do not create IAP products (IAP is deferred). The reviewer notes already state the app is free.
7. **EULA:** Apple Standard EULA is fine.
8. **App Review Information:** paste the "Notes for Reviewer" block from `APP_REVIEW_NOTES.md`, including the `reviewer@flybye.app` test account.
9. Submit. Make sure the `support@flybye.app` inbox is monitored — reviewers email it.

**v1.1 obligation:** Apple's account-deletion rule (5.1.1(v)) is met for first review via the documented support-email fallback, but you must ship in-app deletion within ~30 days. Plan a `delete_self` Supabase RPC + wire the Settings "Delete account" button to it (it currently shows the support-email snackbar).

---

## D. Google Play (after iOS is stable)

1. `flutter build appbundle --release` (set up a release keystore + `android/key.properties` first — the build currently uses debug signing per the `// TODO` in `build.gradle.kts`).
2. Google Play Console → create app → app id `app.flybye.flybye`.
3. Complete the Data safety form, content rating (IARC, 18+), target audience (adults), and a Play-specific privacy policy URL.
4. Internal testing track first → closed/open testing → production.
5. Android also needs the in-app account-deletion path and a publicly reachable account-deletion URL (Google requires both).

---

## Backend — already live, no action needed to publish

Schema applied, demo seed + evergreen `refresh_demo_flights` cron running, `airports` populated (50 rows), reviewer account approved. The RevenueCat webhook is deployed-ready for when IAP returns.

### Optional hardening (not launch-blocking — from Supabase advisors)
- Enable **leaked-password protection** (Auth settings).
- Set a fixed `search_path` on `tg_set_updated_at` and `tg_bump_match_last_message`.
- The `public` bucket `avatars` has a broad list policy; tighten if you don't need listing.
- Several `SECURITY DEFINER` trigger functions are flagged by the linter; these are normal trigger functions, but review `discover_at_airport` / `get_my_subscription_tier` / `refresh_demo_flights` execute grants if you want to restrict who can call them via the REST RPC endpoint.

---

## Quick pre-submit checklist

- [ ] `flutter analyze` clean
- [ ] On-device smoke test passes (esp. flight screen + report/block in deck and chat)
- [ ] Screenshots match the real app
- [ ] `privacy` and `support` pages live
- [ ] Reviewer notes pasted, `reviewer@flybye.app` works, support inbox monitored
- [ ] No IAP products declared (v1.0 is free)
- [ ] Bundle id `app.flybye.flybye` consistent across Xcode + App Store Connect
