# Publishing FlyBye without a Mac

You don't need a Mac, Xcode, or the command line. A cloud service called **Codemagic** rents a Mac in the cloud, builds the app, signs it, and sends it to TestFlight for you. Everything below happens in a web browser. I've already written the build config (`codemagic.yaml`) — you just connect the accounts.

There are three things only you can do, because they're tied to your identity and a credit card:

1. **Apple Developer Program** — $99/year, unavoidable. Apple requires it to put any app on iPhones. (https://developer.apple.com/programs/enroll)
2. **Get the code onto GitHub** — free, ~10 min with a desktop app, no command line.
3. **Connect Codemagic** — free tier covers this (500 Mac build-minutes/month).

I cannot do these for you because they need your logins and payment, but each is a guided web form. Here's the order.

---

## Step 1 — Put the code on GitHub (no command line)

1. Download **GitHub Desktop** (free, https://desktop.github.com) and sign in / create a GitHub account.
2. In GitHub Desktop: **File → Add Local Repository** → choose the FlyBye App folder.
   - If it says it isn't a Git repository, click **"create a repository"** — accept the defaults and click Create.
3. Click **Publish repository**. Keep **"Keep this code private"** checked. Publish.

Your secrets stay safe: the `.gitignore` already excludes `.env`, keystores, and Google service files, so they won't be uploaded.

> I can initialize the repository for you in the folder so GitHub Desktop just needs "Publish" — say the word and I'll do it.

---

## Step 2 — Apple setup (all on the web)

1. **Enroll** in the Apple Developer Program: https://developer.apple.com/programs/enroll ($99/yr). Use the PaperStreet NY entity if you want the company as the seller.
2. In **App Store Connect** (https://appstoreconnect.apple.com):
   - **Apps → +** → New App → iOS → name **FlyBye** → bundle ID **app.flybye.flybye** (register it if prompted) → SKU `flybye-ios-001`.
   - Open the app you just made and note its **Apple ID** — a long number near the top. You'll paste this into `codemagic.yaml` (the `APP_STORE_APPLE_ID: 0000000000` line).
3. Create an **App Store Connect API key** (this is how Codemagic talks to Apple):
   - **Users and Access → Integrations → App Store Connect API → +**
   - Access: **App Manager**. Name it anything.
   - Download the `.p8` file (you only get one chance) and copy the **Key ID** and **Issuer ID**.

---

## Step 3 — Codemagic (free)

1. Sign up at https://codemagic.io with your GitHub account and authorize it to see your FlyBye repo.
2. **Add the Apple API key:** Codemagic → **Teams → (your team) → Integrations → Apple Developer Portal → Connect / Add key.** Upload the `.p8`, paste **Key ID** + **Issuer ID**. **Name the key `codemagic`** (this matches `codemagic.yaml`).
3. **Add your Supabase secrets:** open the FlyBye app in Codemagic → **Environment variables**:
   - Group name: **flybye_env**
   - `SUPABASE_URL` = (your Supabase URL) — check **Secure**
   - `SUPABASE_ANON_KEY` = (your Supabase anon/publishable key) — check **Secure**
   - (Leave the RevenueCat keys out for now — IAP is off in v1.0.)
4. Edit `APP_STORE_APPLE_ID` in `codemagic.yaml` to the number from Step 2.2 (do it in GitHub Desktop or ask me).
5. In Codemagic, pick the **FlyBye iOS → TestFlight** workflow and click **Start new build**.

Codemagic will fetch packages, run `flutter analyze` (this is also the check I couldn't run here), build the IPA, sign it with a profile it creates automatically, and upload to TestFlight. ~15–25 min. You'll get an email when it lands.

6. In App Store Connect → **TestFlight**, add yourself as an internal tester and install via the **TestFlight** app on your iPhone.

---

## When the build is green

- **Full App Store release:** in `codemagic.yaml` set `submit_to_app_store: true` (or do it from App Store Connect after you've tested). Use `APP_REVIEW_NOTES.md` for the reviewer info and `store-listings.md` for the listing copy.
- **Android / Google Play:** the second workflow (`android-googleplay`) is ready, but Android needs a one-time **release keystore** (a signing file) and a **Google Play service account** key uploaded to Codemagic. Do iOS first; I'll walk you through the Android extras when you're there.

---

## If a build fails

Open the build in Codemagic, copy the red error from the log, and send it to me. The most likely first-build snag is a `flutter analyze` complaint — those are quick to fix and I'll patch the code. This is genuinely the fastest way for us to verify the app compiles, since I can't run Flutter in my own environment.

## What this does and doesn't remove

- ✅ Removes: owning a Mac, installing Xcode, using Terminal, manual signing.
- ❗ Still yours: the Apple Developer fee, clicking through the account setup above, and being the legal "seller" of the app. There's no way around Apple charging $99/yr to publish.
