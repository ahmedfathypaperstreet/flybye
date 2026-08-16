# Mobile (Flutter) Migration Contract — align `flybye` to the unified schema + web

The shared Supabase project (`pngjuliouszzhylkimsd`) runs the unified schema in
`supabase_unified_schema.sql`. The web app (`flybye-webapp`) is already migrated and is the
DESIGN/UX + product reference. Product = **business networking**, **open direct messaging**
(no swipe, no request/accept). Verification gates messaging only.

This contract = **Phase 3a: core parity** (schema + product model + theme + copy). The extra
web features **live lounge presence (location_shares)** and **airport POI map** are Phase 3b
(net-new, tracked separately) — do NOT attempt them here.

## Schema the app must speak (see supabase_unified_schema.sql for full detail)
- **profiles**: `id` (= auth.uid, PK), display_name, avatar_url (single string; NOT a `photos[]`),
  bio, **role, company, industry, intent** (enum `hiring|partnerships|mentorship|networking`),
  **linkedin_url**, home_airport, current_airport, present_until, **verified** (bool — NOTE: renamed
  from `is_verified`), verification_status (`none|pending|approved|rejected`), is_banned, last_seen_at.
  GONE: birthdate, gender, vibe_tags, photos, is_verified, subscription tier.
- **conversations**: id, user_a_id, user_b_id (canonical user_a_id<user_b_id), last_message_at.
  (Replaces `matches`; the mobile app already used user_a_id/user_b_id — just rename to conversations
  and create rows via the RPC, NOT via a swipe/mutual-like trigger.)
- **messages**: id, **conversation_id** (renamed from match_id), sender_id, body, read_at, created_at.
- **verification_requests**: id, user_id, **document_url** (renamed from selfie_url), status
  (`pending|approved|rejected`), reviewed_by, reviewed_at, rejection_reason.
- **blocks**, **reports** — same as before (keep report/block flows).
- **flights** — id, user_id, flight_number, departure_airport, arrival_airport, departure_time,
  arrival_time, layover_airport, layover_duration_minutes. (NOTE: itinerary shape, NOT the old
  single airport_iata/active_until.)
- **airports** — iata_code, name, city, country, timezone, latitude, longitude.

## RPCs (call these; already exist on the server)
- `discover_at_airport()` — **no arguments**; returns profile rows at my current_airport now.
- `get_or_create_conversation(other uuid)` — returns conversation id; throws if caller not verified.
- `mark_conversation_read(conv uuid)` — replaces the old `mark_message_read`.
- `touch_last_seen()`.

## Required changes
1. **Env/boot**: app reads `.env` (already created, points at the shared project). Keep
   `Supabase.initialize` with the PKCE flow. Confirm it boots (no missing-key crash).
2. **Profiles**: replace dating fields (birthdate, gender, vibe_tags, photos[]) with the business
   fields (role, company, industry, intent, linkedin_url) + single `avatar_url`. Update the
   profile model class, `profile_repo`, profile screen (view + **edit** form — editing must be
   exposed), and onboarding (collect business fields + single headshot to `avatars` bucket at
   `${uid}/...`). Use `verified` (not `is_verified`).
3. **Discover**: remove the swipe deck (like/pass) and any `swipes` writes. Discover = call
   `discover_at_airport()` and show a browsable list of ConnectionCards (name, role · company,
   industry, intent, verified badge) each with a **Message** button. Message → call
   `get_or_create_conversation(other)` → open the chat for that conversation id. Gate the Message
   action on the current user's `verified` (unverified: "Verify your ID to message").
4. **Conversations + chat**: rename the matches concepts to conversations. `match_repo` →
   conversation/message repo: list conversations where I'm a participant (ordered by last_message_at),
   stream messages by `conversation_id` via Supabase realtime `.stream()`, send inserts
   `{conversation_id, sender_id, body}`, call `mark_conversation_read` on open. Keep report/block in
   the chat header.
5. **Verification**: onboarding/verification uploads a **government ID** file to the **`id-documents`**
   bucket at `${uid}/...`, then upserts `verification_requests {user_id, document_url, status:'pending'}`.
   Remove the selfie/`verifications`-bucket flow. Show status from `profiles.verification_status` +
   `verified` (pending/approved/rejected). Add an in-app status view (pending badge, rejection reason).
6. **Presence**: after saving/updating a flight, update the user's profile
   `current_airport = layover_airport ?? departure_airport`, `present_until = arrival_time`.
   Flight entry must use the new itinerary fields.
7. **Remove monetization**: delete/neutralize the subscription + paywall feature (free v1) — remove
   the `subscription` feature dir usage, the paywall screen, tier gating, RevenueCat remnants, and the
   "Upgrade" entry point. (Leave no dead links.)
8. **Theme → navy/blue** (match web): retheme `core/theme.dart` to the web palette — background deep
   navy `#0A1526` (hsl 224 55% 8%), primary blue (hsl 209 52% 52% ≈ `#4A90D9`), accent steel blue
   (hsl 212 34% 72%). Dark-first; make in-app screens readable on the dark background (the old app
   pinned to light because dark was broken — fix so a proper dark theme works, then default to it).
9. **Copy**: business-networking language throughout ("connections"/"message", never
   "swipe"/"match"/"vibes"/dating). Mirror the web's tone.

## Out of scope here (do NOT do)
- location_shares / lounge presence, airport POI map (Phase 3b).
- Account deletion RPC, password-reset deep-link wiring, Capacitor (Phase 4).
- Do not touch the web app or the .env files.

## Working style & Definition of done
- `flutter pub get` then **`flutter analyze`** must pass with no new errors (note any pre-existing).
- Remove now-unused files (swipe widgets, paywall, subscription_service) rather than leaving dead code.
- Do not attempt a full device build (signing). `flutter analyze` is the bar.
- Report: files changed (one-line why), files deleted, final `flutter analyze` tail, anything not done,
  and runtime caveats needing live-DB/device testing.
