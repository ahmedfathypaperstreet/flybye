# App Review Notes — FlyBye

Paste the **"Notes for Reviewer"** section below into App Store Connect → **App Review Information** when submitting. The other sections are reference for you.

---

## Notes for Reviewer (paste this into App Store Connect)

```
FlyBye is a social discovery app for travelers at airports. Users add their
flight, browse other travelers at the same airport, and chat in real time.

TEST ACCOUNT
Email:    reviewer@flybye.app
Password: ReviewMe2026!

If a fresh account is required:
  Tap "Create account" → use any email + password 8+ chars + birthdate before
  2008-01-01 → take a profile photo and a verification selfie → answer the
  vibes prompt → add a flight (try airport "JFK", any departure within
  the next 24h) → you'll see the discover deck.

DEMO DATA
Two pre-populated test profiles are already at JFK and LAX so the
discover deck has cards. The reviewer test account is already verified.

REPORTING & BLOCKING (Apple Guideline 1.2)
- From any profile in the discover deck: tap the ⋯ icon at top-right of
  the card.
- From an active chat: tap the ⋯ icon in the chat header.
- Both flows present a "Report and block" / "Report only" sheet with
  five reason categories. Reports are written to our admin queue;
  "Report and block" also adds a row to the blocks table that hides the
  user from both feeds bidirectionally.

AGE GATE
The sign-up date picker hard-blocks any birthdate younger than 18 years
ago. The profiles table has a CHECK constraint enforcing the same.

VERIFICATION
At signup, every user submits a selfie that lands in a private review
queue (Supabase Storage bucket `verifications`). Profiles display a
"Verification pending" badge until reviewed. The reviewer test account
is pre-approved.

SUBSCRIPTIONS
This build (v1.0) is FREE with no in-app purchases. All core features
(swipe, match, chat) are fully usable at no cost. Paid tiers (Regular,
First Class) will be introduced in a later update with their own review.
There are no active auto-renewable subscriptions in this build.

ACCOUNT DELETION
Settings → "Delete account" surfaces a support contact (support@flybye.app)
which deletes within 30 days. We will ship in-app deletion in v1.1
(targeting 30 days post-launch).

PUSH NOTIFICATIONS
Disabled in v1.

PRIVACY POLICY
https://flybye.app/privacy

CONTACT
support@flybye.app
```

---

## What reviewers actually look for (so you can pre-flight before submission)

### Apple Guideline 1.2 — User-Generated Content
The four required mechanisms for any UGC app:
1. **A method to filter objectionable content.** ✅ FlyBye has no public feed; users only see profiles of travelers at their own current airport.
2. **A mechanism to report objectionable content.** ✅ `report_block_sheet.dart`.
3. **The ability to block abusive users.** ✅ Same sheet writes to `blocks`.
4. **Published contact info.** ✅ support@flybye.app, on the privacy policy.

### Apple Guideline 5.1.1(v) — Account Deletion
Required since June 2022. v1 deflects to support email — acceptable for **first** review only if you call it out explicitly in the reviewer notes (we do, above). v1.1 must add an in-app `delete_self` RPC.

### Apple Guideline 3.1.2 — Subscriptions
**Not applicable to the v1.0 build.** IAP is disabled (the iOS 26 crash on
`purchases_flutter` 8.x — see `REVENUECAT_REENABLE.md`), so there are no
auto-renewable subscriptions for the reviewer to evaluate. The paywall is a
"coming soon" placeholder. Do not declare subscription products in App Store
Connect for this build.

When you re-enable IAP (v1.1), the paywall in `REVENUECAT_REENABLE.md`
already includes the required auto-renew disclosure + Restore Purchases, and
the reviewer notes' SUBSCRIPTIONS section must be updated to describe the
tiers before that submission.

### Apple Guideline 5.1.1 — Permission Strings
Camera, Photo Library, Photo Library Add — all included in `Info.plist.snippet.xml` with human-readable explanations. Required.

### Common rejection reasons specific to dating/social apps
- **No way to report a user from inside a chat.** ✅ Resolved — report/block is in the chat header (⋯) AND on each discover deck card (⋯ top-right).
- **Profile photos that aren't the actual user.** Selfie verification mitigates this.
- **No 17+/18+ age gate.** ✅ enforced.

---

## Pre-submission checklist (copy into a TODO before you build)

- [ ] Create `reviewer@flybye.app` test account with a verification record manually approved
- [ ] Seed two demo profiles at JFK so reviewer's deck isn't empty
- [x] Auto-renew text on paywall — N/A for v1.0 (IAP disabled); handled in REVENUECAT_REENABLE.md for v1.1
- [x] Report icon in the chat screen `AppBar` — present (PopupMenuButton → ReportBlockSheet)
- [x] Report/block from the discover deck card — added (⋯ menu top-right of card)
- [ ] Confirm support@flybye.app inbox is monitored (reviewer will email it)
- [ ] Privacy policy live at `https://flybye.app/privacy`
- [ ] Support page live at `https://flybye.app/support` (it's the URL in the App Store listing)
- [ ] EULA selected: Apple's Standard EULA (or upload custom in App Store Connect → Agreements)
- [ ] Screenshots match what's actually in the app (don't ship promo art that doesn't appear)
- [ ] Build with `flutter build ipa --release` and verify on a TestFlight install before submitting for review
