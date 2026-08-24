# Deploying FlyBye for testers

## A) Web app → Vercel (free)

The SPA config is in `flybye-webapp/vercel.json` (Vite build + client-side-routing
rewrites). `.env` is NOT committed, so you MUST set the Supabase vars in Vercel.

### Option 1 — Vercel CLI (fastest)
```bash
npm i -g vercel
cd flybye-webapp
vercel        # first run: log in, "set up and deploy", accept defaults
vercel --prod # promote to a production URL
```
When prompted for the project root, it's the current folder (`flybye-webapp`).

### Option 2 — GitHub import (auto-deploy on push)
1. Push the repo to GitHub.
2. vercel.com → New Project → import the repo.
3. **Root Directory → `flybye-webapp`** (important — it's a monorepo).
4. Framework preset: Vite (auto-detected). Deploy.

### Required environment variables (set in Vercel → Project → Settings → Environment Variables)
| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://pngjuliouszzhylkimsd.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_bc47hZYkv29RZ0PW-q6dIw_koUrcXjL` |
| `SUPABASE_URL` | same URL (used by the Lovable Vite plugin at build) |
| `SUPABASE_PUBLISHABLE_KEY` | same publishable key |

(The publishable key is a client key — safe to expose. Redeploy after adding vars.)

### After it's live
- Copy the Vercel URL (e.g. `https://flybye-xyz.vercel.app`).
- Supabase → **Auth → URL Configuration → Redirect URLs**: add that URL (so email
  confirm / password reset / OAuth redirect back correctly). The app uses
  `window.location.origin`, so no code change needed.
- Send the URL to testers.

---

## B) Mobile app → TestFlight (iOS)

Requires a **Mac + Xcode**, an **Apple Developer Program** membership ($99/yr),
and doing the signing/upload yourself (credentials + interactive steps).

Current readiness: bundle id `app.flybye.flybye`, version `0.2.0+2`, camera/photo
Info.plist strings present, deep link `flybye://` registered. ✅

### Fastest path (local Mac)
1. **App Store Connect** (appstoreconnect.apple.com) → Apps → **＋** → new app,
   bundle id `app.flybye.flybye` (register it in the Developer portal first if needed).
2. Open the iOS project in Xcode:
   ```bash
   cd flybye-app && open ios/Runner.xcworkspace
   ```
   Select the **Runner** target → Signing & Capabilities → check **Automatically
   manage signing** → pick your **Team**.
3. Build the release IPA:
   ```bash
   flutter build ipa
   ```
   Output: `build/ios/ipa/flybye.ipa`.
4. Upload it: open the **Transporter** app (free, Mac App Store) → sign in → drag in
   the `.ipa` → Deliver. (Or use Xcode → Product → Archive → Distribute.)
5. App Store Connect → your app → **TestFlight**:
   - **Internal testers** (up to 100, no review, available in minutes) — add testers,
     they install via the TestFlight app.
   - **External testers** (public link, up to 10k) — needs a short Beta App Review first.

### Alternative — Codemagic CI (no local Xcode wrangling)
`flybye-app/codemagic.yaml` exists. Connect the repo at codemagic.io, add your
App Store Connect API key + signing, and it can build & publish to TestFlight on push.
(The file predates the pivot — review it before first use.)

### ⚠️ Before EXTERNAL TestFlight / App Store review — update stale docs
These still describe the OLD dating app (RevenueCat subscriptions, selfie
verification, "matches") and must be rewritten for the business-networking product:
`flybye-app/APP_REVIEW_NOTES.md`, `store-listings.md`, `REVENUECAT_REENABLE.md`,
`TESTFLIGHT_*.md`. Internal TestFlight testing does not need them.

### Android (optional, much easier for testers)
`flutter build apk --release` → send the APK directly, or upload an
`--release` app bundle to Google Play internal testing.
