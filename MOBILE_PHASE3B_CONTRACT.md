# Mobile Phase 3b — location sharing + airport POI map (full web parity)

Add the two remaining web features to the Flutter app `flybye-app` so mobile matches web.
Backend tables already exist in the unified schema (`location_shares`, `airport_pois_cache`);
the `airport-pois` edge function is already fixed for the unified schema and will be deployed
to the shared project. Mirror the web behavior in `flybye-webapp/src/components/LocationShareCard.tsx`
and `TerminalMap.tsx`. Keep the app's navy/blue theme and business tone.

## A. Live location / lounge presence  (table: location_shares)
Columns: user_id (=profiles.id, unique), airport, terminal, zone, note, is_active,
last_seen_at, created_at, updated_at. RLS: owner manages own; anyone authenticated reads `is_active=true`.

Build a `location_shares` repo + a **LocationShareCard** widget shown in the **chat screen**
(one per conversation), mirroring the web:
- Shows MY share toggle (on/off). When on, editable Terminal / Zone / Note fields + a Save button.
- On enable: upsert `{ user_id, airport, terminal, zone, note, is_active:true, last_seen_at:now }`
  onConflict user_id. `airport` = my `profiles.current_airport` (fall back to existing share airport);
  if none, prompt "set your current airport (add a flight) first" and don't enable.
- Heartbeat: while active, update `last_seen_at` every 60s.
- Turn sharing OFF when the app is backgrounded (use WidgetsBindingObserver didChangeAppLifecycleState).
- Shows the OTHER participant's active share (airport · Terminal · Zone · note · "updated HH:MM"),
  live via a Supabase realtime `.stream()` on location_shares filtered to the other user (or 15s poll
  fallback). "They aren't sharing right now" empty state.

## B. Airport POI map  (edge function: airport-pois)
Add deps: `flutter pub add flutter_map latlong2`. Build a **TerminalMap** widget shown in the
**discover screen** (a map section/tab, like the web Discover map), for the user's current airport
(`profiles.current_airport`; if null, show "Add a flight to load the terminal map.").
- Fetch POIs: `supabase.functions.invoke('airport-pois', queryParameters: {'iata': iata})`
  (if that param form isn't supported by supabase_flutter 2.5.6, call it as
  `functions.invoke('airport-pois?iata=$iata')`). Response = `{ airport: {iata, latitude, longitude,
  name, city, bbox_*:null}, pois: [{id, name, category, lat, lon}] }`.
- Render with flutter_map using OSM raster tiles:
  urlTemplate `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, set userAgentPackageName `app.flybye.flybye`.
  Center on airport lat/long, zoom ~14.
- One marker per POI, colored/icon by category. Categories + colors (match web):
  food (primary blue, restaurant icon), lounge (steel accent, weekend/sofa icon), shop (amber, bag),
  restroom (light blue, wc), info (purple, info). Tapping a marker shows the POI name + category.
- Category filter chips (toggle each on/off) with counts, like the web.
- Loading spinner while fetching; graceful empty/error state ("Couldn't load places right now.").
- Cache the last successful payload (in-memory is fine; a simple shared-prefs cache is a bonus, not required).

## Wiring
- Discover: add the map (a toggle between the people list and the map, or a section) — do not remove
  the existing discover→message list.
- Chat: add the LocationShareCard near the top of the conversation.
- Add any new routes if you make full screens (prefer inline widgets/sections to match web).

## Out of scope
- Do NOT change the web app, .env files, or SQL. Do NOT deploy the edge function (that's a separate step).
- No device geolocation/GPS — presence is manual (airport comes from the user's flight), same as web.

## Working style & Definition of done
- Use the Flutter SDK at /Users/ahmedfathy/development/flutter/bin.
- `flutter pub get` then iterate until `flutter analyze` passes with NO errors/warnings
  (info-level lints acceptable; prefer to `dart fix --apply` them).
- Report: files added/changed (one-line why), new deps, final `flutter analyze` tail, anything not done,
  and runtime caveats needing live testing (e.g. realtime, function response).
