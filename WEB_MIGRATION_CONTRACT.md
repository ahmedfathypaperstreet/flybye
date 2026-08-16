# Web App Migration Contract — old schema → unified business/open-DM schema

The shared Supabase project (`pngjuliouszzhylkimsd`) now runs the unified schema in
`supabase_unified_schema.sql`. Rewrite the web app (`flybye-webapp`) to match it.
Product is **business networking** (not dating). Connection model is **open direct
messaging** — no swipe, no request/accept. Verification gates messaging only.

## New schema (authoritative)
- **profiles**: `id` (= auth.users.id, PRIMARY KEY — there is NO `user_id` column anymore),
  display_name, avatar_url, bio, **role, company, industry, intent** (enum:
  `hiring|partnerships|mentorship|networking`), **linkedin_url**, home_airport,
  **current_airport, present_until**, **verified** (bool),
  verification_status (enum: `none|pending|approved|rejected`), is_banned,
  last_seen_at, created_at, updated_at.
  REMOVED columns: user_id, gender, gender_preference, travel_style, interests,
  connection_mode, verification_inquiry_id, verification_method, id_upload_complete, verified_at.
- **flights**: id, user_id(→profiles.id), flight_number, departure_airport, arrival_airport,
  departure_time, arrival_time, layover_airport, layover_duration_minutes, created_at, updated_at.
- **conversations**: id, user_a_id, user_b_id (canonical: user_a_id < user_b_id), last_message_at.
- **messages**: id, **conversation_id** (NOT match_id), sender_id, **body** (NOT content),
  read_at, created_at.
- **blocks**: blocker_id, blocked_id.  **reports**: id, reporter_id, reported_id, reason, details, status.
- **verification_requests**: id, user_id, document_url, status (`pending|approved|rejected`),
  reviewed_by, reviewed_at, rejection_reason, created_at.
- **location_shares**: id, user_id, airport, terminal, zone, note, is_active, last_seen_at, ... (unchanged).
- **airport_pois_cache**: iata, category, data(jsonb), fetched_at (unchanged).
- **airports**: iata_code, icao_code, name, city, country, timezone, latitude, longitude.
- GONE: `matches`, `swipes`, `subscriptions`, `attestations`, `profiles_public` (view),
  email_* tables (leave any code referencing them disabled/removed).

## RPCs (use these; do not re-implement client-side)
- `discover_at_airport()` → returns profile rows at my `current_airport` now (verified, not blocked/banned, not me).
- `get_or_create_conversation(other uuid)` → returns conversation id. **Requires caller `verified=true`** (throws otherwise → surface "verify to message").
- `mark_conversation_read(conv uuid)` → void.
- `touch_last_seen()` → void.

## Required code changes (apply throughout)
1. **`profiles.user_id` → `profiles.id`.** Everywhere: `.eq("user_id", user.id)` → `.eq("id", user.id)`;
   any `profile.user_id` → `profile.id`.
2. **`from("profiles_public")` → `from("profiles")`** (RLS already allows authenticated SELECT).
3. **Remove the swipe model.** Delete `matches` inserts/deletes and swipe UI. Discover becomes a
   **browsable list/grid of ProfileCards** with a **"Message" button** that calls
   `supabase.rpc("get_or_create_conversation", { other: profile.id })` then navigates to `/chat/:conversationId`.
   Keep `SwipeCard` only if repurposed as a static card; otherwise use `ProfileCard`.
4. **Discover data** = `supabase.rpc("discover_at_airport")` (no client-side filtering by gender/mode).
   Show role · company · industry · intent · verified badge. Empty state: "No verified professionals at
   your terminal right now."
5. **Messages**: `match_id` → `conversation_id`, `content` → `body`. Replace the 3s polling in `Chat.tsx`
   with a Supabase realtime subscription: `supabase.channel(...).on('postgres_changes', {event:'INSERT',
   schema:'public', table:'messages', filter:'conversation_id=eq.'+id}, ...)`. Keep optimistic send.
   Call `mark_conversation_read` on open.
6. **Matches page → Conversations list**: list `conversations` where I'm a participant, ordered by
   last_message_at, showing the other participant's profile + last message preview. Route `/matches` may stay
   or become `/messages`.
7. **Profile page**: edit form for the business fields (display_name, role, company, industry, intent
   [select], linkedin_url, bio, home_airport). **Real avatar upload** to the `avatars` bucket at path
   `${user.id}/<filename>` then store the path/public URL in `avatar_url` (replace the paste-URL input).
   Remove gender/travel_style/interests inputs.
8. **Verification**: upload the ID file to the `id-documents` bucket at `${user.id}/<filename>`, then
   `upsert` a `verification_requests` row `{ user_id, document_url, status:'pending' }`. REMOVE all Persona /
   `start-verification` edge calls. Status UI simplifies to none/pending/approved/rejected reading
   `profiles.verification_status` (+ `verified`). No `processing/failed/expired/queued`.
9. **Presence**: when a user saves/updates their flight, also set their profile presence:
   `update profiles set current_airport = <layover_airport ?? departure_airport>,
   present_until = <arrival_time or layover end>` for that user. Add a small helper and call it after
   flight save. Discovery relies on this.
10. **offline queue** (`syncQueue.ts`/`offlineCache.ts`): remove the `swipe` and `start-verification`
    mutation kinds (and any `create-checkout`/Stripe references). Keep generic offline caching if trivial;
    otherwise it's fine to no-op these.
11. **`types.ts`**: rewrite `Database` types to match the new schema tables + RPC signatures above
    (or relax to `any` where a full type is impractical, but prefer correct types for profiles/conversations/messages/flights).
12. Gate the "Message" action + composer on `profiles.verified`; unverified users see a "Verify your ID to
    message" prompt (browsing stays open).

## Design / product
- Keep the current dark navy + blue theme (it's the chosen shared identity). Business copy stays.
- Do NOT reintroduce dating language (matches→"connections"/"messages", swipe→"message").

## Definition of done
- `npx tsc --noEmit` passes (or only pre-existing unrelated errors remain).
- `npm run build` succeeds.
- No references remain to: `profiles_public`, `matches` table, `swipes`, `messages.content`,
  `match_id`, `start-verification`, `profiles.user_id`, `gender_preference`, `connection_mode`.
