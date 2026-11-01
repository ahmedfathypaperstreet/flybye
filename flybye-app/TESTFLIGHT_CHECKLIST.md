# FlyBye — Path to TestFlight

This is the exact sequence to go from "fresh Mac" to "build is in TestFlight." Steps marked **[you]** require a human at the keyboard with credentials.

---

## 0. Prerequisites — **[you]**

- macOS with Xcode 15.4+ installed (`xcode-select --install`)
- Flutter 3.22+ on the path: `flutter --version`
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Program membership ($99/yr) for **PaperStreet NY** (or whichever entity will publish FlyBye)
- A unique bundle ID. Recommended: `app.flybye.ios` (and `app.flybye.android` later).

---

## 1. Create the Flutter project shell

The repo already has `lib/`, `pubspec.yaml`, and the rest of the app code. Generate the iOS/Android platform folders on top of it:

```bash
cd "/Users/paperii/Documents/Claude/Projects/FlyBye App"

# Generate ios/, android/, test/, web/ without overwriting our lib/ or pubspec.yaml
flutter create \
  --platforms=ios,android \
  --org app.flybye \
  --project-name flybye \
  .

# Pull deps
flutter pub get
cd ios && pod install && cd ..
```

If `flutter create` complains about an existing project, delete `flybye.iml` and retry — it shouldn't touch any of our `lib/` files.

---

## 2. Wire the iOS platform config

1. Open `ios/Runner/Info.plist` in Xcode (or a text editor).
2. Paste in everything from `ios/Runner/Info.plist.snippet.xml` inside the top-level `<dict>`.
3. In Xcode:
   - Select **Runner** in the project navigator → **Signing & Capabilities** tab.
   - Set **Team** to your Apple Developer team.
   - Set **Bundle Identifier** to `app.flybye.ios`.
   - Increment **Build** to `1` and **Version** to `0.1.0`.
4. Set the deployment target. In `ios/Podfile`, ensure:
   ```ruby
   platform :ios, '13.0'
   ```
5. Re-run `cd ios && pod install`.

## 3. Wire the Android platform config

1. Open `android/app/src/main/AndroidManifest.xml` and paste in the snippets from `android/app/src/main/AndroidManifest.snippet.xml`.
2. In `android/app/build.gradle`:
   ```gradle
   defaultConfig {
       applicationId "app.flybye.android"
       minSdkVersion 23      // Supabase Realtime websockets need 23+
       targetSdkVersion 34
   }
   ```

---

## 4. Push the Supabase schema — **[you]**

```bash
cd "/Users/paperii/Documents/Claude/Projects/FlyBye App"
brew install supabase/tap/supabase
supabase login
supabase link --project-ref pngjuliouszzhylkimsd
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed/airports_seed.sql
supabase functions deploy revenuecat-webhook
supabase secrets set RC_WEBHOOK_SECRET="$(openssl rand -hex 32)"
```

In the Supabase dashboard:
- **Authentication → URL Configuration → Redirect URLs**: add `flybye://reset-password`
- **Authentication → Email Templates → Reset Password**: paste `supabase_reset_email_template.html`
- **Database → Replication**: confirm `messages` and `matches` are in the `supabase_realtime` publication
- **Storage**: confirm `avatars` (public) and `verifications` (private) buckets exist

---

## 5. RevenueCat setup — **[you]**

1. Create a RevenueCat project. In **Project → Apps**, add the iOS app with bundle `app.flybye.ios`.
2. **Entitlements**: create `regular` and `first_class`.
3. **Products**: create the App Store products in App Store Connect first (`flybye_regular_monthly`, `flybye_first_class_monthly`, `flybye_regular_annual`, `flybye_first_class_annual`), then add them to RevenueCat and attach to the right entitlement.
4. **Offerings**: create a `default` offering with all four packages.
5. **Integrations → Webhooks**: URL = `https://pngjuliouszzhylkimsd.functions.supabase.co/revenuecat-webhook`, Authorization header = `Bearer <RC_WEBHOOK_SECRET>` from step 4.
6. Copy the **iOS public app-specific API key** (starts with `appl_`) into `.env` as `REVENUECAT_IOS_KEY`.

---

## 6. App Store Connect listing — **[you]**

In App Store Connect → **My Apps → +**:
- Platform: iOS
- Name: **FlyBye** (or "FlyBye - Meet at Your Airport" if FlyBye alone is taken)
- Primary Language: English (U.S.)
- Bundle ID: `app.flybye.ios`
- SKU: `flybye-ios-001`
- User Access: Full Access

Then in **App Information**:
- Use the copy from `store-listings.md` — name, subtitle, promo text, description, keywords, age rating answers, support URL, privacy policy URL.
- Upload screenshots (6.7" iPhone, 1290×2796) — to capture from a running build, use the iOS Simulator: ⌘+S saves a 1290×2796 screenshot.
- Privacy Policy URL: must be live at `https://flybye.app/privacy`. The HTML in `privacy-policy.html` is ready to host.

---

## 7. Build & upload — **[you]**

```bash
cd "/Users/paperii/Documents/Claude/Projects/FlyBye App"
flutter build ipa --release
```

Then:
- `open build/ios/archive/Runner.xcarchive` (opens Xcode Organizer)
- Click **Distribute App → App Store Connect → Upload**.
- Or via command line: `xcrun altool --upload-app -f build/ios/ipa/flybye.ipa -t ios -u <apple-id> -p <app-specific-password>`.

Wait ~20 min for processing. Then in App Store Connect → **TestFlight**:
- Add yourself + early testers under **Internal Testing**.
- Once you've used it for a day, promote to **External Testing** (requires brief review — usually <24h).

---

## 8. Pre-submission review-blocker checklist

- [ ] **Selfie verification flow works.** App Review will create an account; if there's no path through onboarding, they reject.
- [ ] **Reporting and blocking visible** in chat header AND profile menu (Apple guideline 1.2 for UGC apps).
- [ ] **EULA link** in Settings (Apple's Standard EULA is fine — link in App Store Connect).
- [ ] **Account deletion** — App Store now requires in-app deletion. v1.1 todo, but for first review the support@flybye.app fallback is accepted IF clearly documented in the review notes.
- [ ] **Subscription terms** screen visible from Paywall (auto-renew, cancel anywhere in App Store).
- [ ] **Test account credentials** added to App Review notes.
- [ ] **Push notifications** off for v1 (we'll add in 1.1) — easier review.

---

## 9. After TestFlight is live

1. Test the full loop: signup → onboarding → flight → discover → match → chat → paywall.
2. Iterate on any rough edges (the first 50 builds usually fix copy and tap targets).
3. Once stable, submit for App Store review.
4. Repeat steps 1–8 for Android with Google Play Console.
