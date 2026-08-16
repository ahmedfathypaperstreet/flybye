# FlyBye — Supabase backend

## Layout

```
supabase/
├── migrations/
│   ├── 20260505000001_init_schema.sql
│   ├── 20260505000002_rls_policies.sql
│   ├── 20260505000003_rpc_helpers.sql
│   └── 20260505000004_storage_realtime.sql
├── seed/
│   └── airports_seed.sql
└── functions/
    └── revenuecat-webhook/
        ├── index.ts
        └── deno.json
```

## First-time setup

1. Install the Supabase CLI: `brew install supabase/tap/supabase`.
2. Initialize and link:
   ```bash
   supabase init
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   ```
3. Push the schema:
   ```bash
   supabase db push
   ```
4. Run the seed (top airports):
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/seed/airports_seed.sql
   ```
   Or paste it into the SQL editor in the dashboard.
5. Deploy the RevenueCat webhook:
   ```bash
   supabase functions deploy revenuecat-webhook
   supabase secrets set RC_WEBHOOK_SECRET="$(openssl rand -hex 32)"
   ```
   The function URL is `https://<ref>.functions.supabase.co/revenuecat-webhook`. Paste it into RevenueCat → Project → Integrations → Webhooks, and set the **Authorization** header to `Bearer <RC_WEBHOOK_SECRET>`.
6. In Supabase → Authentication → URL Configuration → Redirect URLs, add `flybye://reset-password` (already documented in `deep_link_setup.md`).
7. Confirm Realtime: Database → Replication → `supabase_realtime` should list `messages` and `matches`.

## RevenueCat configuration

- Apple App Store and Google Play apps configured in RevenueCat.
- Entitlements:
  - `regular` — unlocks priority feed placement, unlimited matches.
  - `first_class` — unlocks top-of-feed, read receipts.
  - (Standby is the absence of either.)
- Products (offerings):
  - `flybye_regular_monthly`, `flybye_regular_annual`
  - `flybye_first_class_monthly`, `flybye_first_class_annual`
- In Flutter, set `Purchases.logIn(supabase.auth.currentUser!.id)` after sign-in so `app_user_id` matches `auth.users.id`.

## Manual selfie verification (v1)

Reviewers approve/reject via direct SQL or a small admin tool (out of scope for v1). To approve:

```sql
update verification_requests
set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
where user_id = '<USER_UUID>';
```

The trigger flips `profiles.is_verified = true` automatically.
