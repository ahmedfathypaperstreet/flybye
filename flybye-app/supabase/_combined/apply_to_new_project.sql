-- ============================================================================
-- FlyBye — consolidated schema for NEW shared project pngjuliouszzhylkimsd
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to run once on an EMPTY project. Order: schema, RLS, RPCs, storage/realtime, airports seed.
-- ============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  migrations/20260505000001_init_schema.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- FlyBye — initial schema
-- ============================================================================
-- Run in order. Idempotent where possible.
-- After running, enable Realtime on `messages` and `matches` from the Supabase
-- dashboard (Database → Replication → supabase_realtime publication).
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type subscription_tier as enum ('standby', 'regular', 'first_class');
exception when duplicate_object then null; end $$;

do $$ begin
  create type swipe_direction as enum ('like', 'pass');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles  (1-1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text        not null check (char_length(display_name) between 1 and 40),
  bio             text                 check (char_length(bio) <= 280),
  birthdate       date        not null,
  gender          text,
  vibe_tags       text[]      not null default '{}',
  photos          text[]      not null default '{}',     -- storage object paths in `avatars` bucket
  is_verified     boolean     not null default false,
  is_banned       boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  constraint profiles_age_18_plus check (birthdate <= (current_date - interval '18 years'))
);

create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

-- updated_at trigger ----------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create a profile shell on signup --------------------------------------
-- The Flutter onboarding flow finishes filling in display_name/birthdate/etc.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, birthdate)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'birthdate')::date, '2000-01-01'::date)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- airports  (static reference data — see seed file)
-- ============================================================================
create table if not exists public.airports (
  iata_code   text primary key check (char_length(iata_code) = 3),
  icao_code   text,
  name        text not null,
  city        text not null,
  country     text not null,
  timezone    text not null,
  latitude    double precision,
  longitude   double precision
);

create index if not exists airports_city_trgm_idx
  on public.airports using gin (lower(city) gin_trgm_ops);
create index if not exists airports_name_trgm_idx
  on public.airports using gin (lower(name) gin_trgm_ops);

-- ============================================================================
-- flights  (the user's current "I'm at this airport" presence)
-- ============================================================================
create table if not exists public.flights (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  airport_iata    text not null references public.airports(iata_code),
  flight_number   text,
  departure_time  timestamptz not null,
  active_until    timestamptz not null,           -- typically departure_time
  created_at      timestamptz not null default now()
);

-- One flight per user. We delete the old row before inserting a new one
-- in the app layer; this enforces it at the DB layer too.
create unique index if not exists flights_one_per_user
  on public.flights (user_id);

create index if not exists flights_airport_active_idx
  on public.flights (airport_iata, active_until);

-- ============================================================================
-- swipes
-- ============================================================================
create table if not exists public.swipes (
  id          uuid primary key default uuid_generate_v4(),
  swiper_id   uuid not null references public.profiles(id) on delete cascade,
  swipee_id   uuid not null references public.profiles(id) on delete cascade,
  direction   swipe_direction not null,
  created_at  timestamptz not null default now(),
  unique (swiper_id, swipee_id),
  check (swiper_id <> swipee_id)
);

create index if not exists swipes_swipee_idx on public.swipes (swipee_id, direction);

-- ============================================================================
-- matches  (canonical pair: user_a < user_b lexicographically)
-- ============================================================================
create table if not exists public.matches (
  id              uuid primary key default uuid_generate_v4(),
  user_a_id       uuid not null references public.profiles(id) on delete cascade,
  user_b_id       uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  unique (user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);

create index if not exists matches_user_a_idx on public.matches (user_a_id, last_message_at desc);
create index if not exists matches_user_b_idx on public.matches (user_b_id, last_message_at desc);

-- Create a match when two users mutually like each other ---------------------
create or replace function public.tg_create_match_on_mutual_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a uuid; b uuid;
begin
  if new.direction <> 'like' then return new; end if;

  if not exists (
    select 1 from public.swipes
    where swiper_id = new.swipee_id
      and swipee_id = new.swiper_id
      and direction = 'like'
  ) then
    return new;
  end if;

  -- canonical ordering
  if new.swiper_id < new.swipee_id then
    a := new.swiper_id; b := new.swipee_id;
  else
    a := new.swipee_id; b := new.swiper_id;
  end if;

  insert into public.matches (user_a_id, user_b_id)
  values (a, b)
  on conflict (user_a_id, user_b_id) do nothing;

  return new;
end $$;

drop trigger if exists swipes_create_match on public.swipes;
create trigger swipes_create_match
  after insert on public.swipes
  for each row execute function public.tg_create_match_on_mutual_like();

-- ============================================================================
-- messages
-- ============================================================================
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz                                  -- populated only for First Class read receipts
);

create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- Bump matches.last_message_at on new message --------------------------------
create or replace function public.tg_bump_match_last_message()
returns trigger language plpgsql as $$
begin
  update public.matches set last_message_at = new.created_at where id = new.match_id;
  return new;
end $$;

drop trigger if exists messages_bump_match on public.messages;
create trigger messages_bump_match
  after insert on public.messages
  for each row execute function public.tg_bump_match_last_message();

-- ============================================================================
-- blocks
-- ============================================================================
create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ============================================================================
-- reports
-- ============================================================================
create table if not exists public.reports (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  reported_id   uuid not null references public.profiles(id) on delete cascade,
  reason        text not null,
  details       text,
  status        report_status not null default 'open',
  created_at    timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status, created_at);

-- ============================================================================
-- subscriptions  (synced from RevenueCat webhook)
-- ============================================================================
create table if not exists public.subscriptions (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  tier             subscription_tier not null default 'standby',
  rc_app_user_id   text,
  product_id       text,
  period_type      text,
  expires_at       timestamptz,
  is_active        boolean not null default false,
  updated_at       timestamptz not null default now()
);

create index if not exists subscriptions_active_idx on public.subscriptions (is_active, expires_at);

-- ============================================================================
-- verification_requests  (selfie + manual review for v1)
-- ============================================================================
create table if not exists public.verification_requests (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null unique references public.profiles(id) on delete cascade,
  selfie_url         text not null,
  status             verification_status not null default 'pending',
  reviewed_by        uuid references auth.users(id),
  reviewed_at        timestamptz,
  rejection_reason   text,
  created_at         timestamptz not null default now()
);

create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at);

-- When a verification is approved, flip profiles.is_verified -----------------
create or replace function public.tg_apply_verification_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update public.profiles set is_verified = true where id = new.user_id;
  elsif new.status = 'rejected' and (old.status is distinct from 'rejected') then
    update public.profiles set is_verified = false where id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists verification_apply on public.verification_requests;
create trigger verification_apply
  after update on public.verification_requests
  for each row execute function public.tg_apply_verification_decision();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  migrations/20260505000002_rls_policies.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- FlyBye — Row-Level Security
-- ============================================================================
-- Run after init_schema. Every table that holds user data is RLS-on.
-- Service role (used by edge functions) bypasses RLS automatically.
-- ============================================================================

-- profiles --------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (
    not is_banned
    and not exists (
      select 1 from public.blocks
      where (blocker_id = auth.uid() and blocked_id = profiles.id)
         or (blocker_id = profiles.id and blocked_id = auth.uid())
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_banned = false);

-- Insert is handled by the on_auth_user_created trigger; no client INSERT.

-- airports --------------------------------------------------------------------
alter table public.airports enable row level security;

drop policy if exists "airports_read_all" on public.airports;
create policy "airports_read_all"
  on public.airports for select
  to authenticated
  using (true);

-- flights ---------------------------------------------------------------------
alter table public.flights enable row level security;

drop policy if exists "flights_select_active" on public.flights;
create policy "flights_select_active"
  on public.flights for select
  to authenticated
  using (
    active_until > now()
    and not exists (
      select 1 from public.blocks
      where (blocker_id = auth.uid() and blocked_id = flights.user_id)
         or (blocker_id = flights.user_id and blocked_id = auth.uid())
    )
  );

drop policy if exists "flights_insert_own" on public.flights;
create policy "flights_insert_own"
  on public.flights for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "flights_update_own" on public.flights;
create policy "flights_update_own"
  on public.flights for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "flights_delete_own" on public.flights;
create policy "flights_delete_own"
  on public.flights for delete
  to authenticated
  using (user_id = auth.uid());

-- swipes ----------------------------------------------------------------------
alter table public.swipes enable row level security;

drop policy if exists "swipes_select_own" on public.swipes;
create policy "swipes_select_own"
  on public.swipes for select
  to authenticated
  using (swiper_id = auth.uid());

drop policy if exists "swipes_insert_own" on public.swipes;
create policy "swipes_insert_own"
  on public.swipes for insert
  to authenticated
  with check (swiper_id = auth.uid());

-- matches ---------------------------------------------------------------------
alter table public.matches enable row level security;

drop policy if exists "matches_select_member" on public.matches;
create policy "matches_select_member"
  on public.matches for select
  to authenticated
  using (auth.uid() in (user_a_id, user_b_id));

-- INSERT happens through the swipes trigger (security definer); no client INSERT.

drop policy if exists "matches_delete_member" on public.matches;
create policy "matches_delete_member"
  on public.matches for delete
  to authenticated
  using (auth.uid() in (user_a_id, user_b_id));

-- messages --------------------------------------------------------------------
alter table public.messages enable row level security;

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and auth.uid() in (m.user_a_id, m.user_b_id)
    )
  );

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and auth.uid() in (m.user_a_id, m.user_b_id)
    )
  );

-- read_at is updated by an RPC call (only allowed if user is the recipient
-- AND has First Class entitlement) — see rpc_helpers migration.

-- blocks ----------------------------------------------------------------------
alter table public.blocks enable row level security;

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- reports ---------------------------------------------------------------------
alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- subscriptions ---------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT/UPDATE only via service role (RevenueCat webhook).

-- verification_requests -------------------------------------------------------
alter table public.verification_requests enable row level security;

drop policy if exists "verifications_select_own" on public.verification_requests;
create policy "verifications_select_own"
  on public.verification_requests for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "verifications_insert_own" on public.verification_requests;
create policy "verifications_insert_own"
  on public.verification_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE (review decisions) only via service role / admin dashboard.


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  migrations/20260505000003_rpc_helpers.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- FlyBye — RPCs the app calls
-- ============================================================================

-- discover_at_airport ---------------------------------------------------------
-- Returns candidate profiles to swipe on, for a given airport.
-- Filtering: active flight at airport, not self, not already swiped, not
-- blocked, not banned. First Class subs are floated to the top, then Regular,
-- then Standby; tie-broken by most recently seen.
create or replace function public.discover_at_airport(
  p_airport_iata text,
  p_limit int default 25
) returns table (
  user_id        uuid,
  display_name   text,
  bio            text,
  birthdate      date,
  vibe_tags      text[],
  photos         text[],
  is_verified    boolean,
  flight_id      uuid,
  departure_time timestamptz,
  tier           subscription_tier
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.display_name,
    p.bio,
    p.birthdate,
    p.vibe_tags,
    p.photos,
    p.is_verified,
    f.id,
    f.departure_time,
    coalesce(s.tier, 'standby'::subscription_tier) as tier
  from public.flights f
  join public.profiles p on p.id = f.user_id
  left join public.subscriptions s
    on s.user_id = p.id and s.is_active and (s.expires_at is null or s.expires_at > now())
  where f.airport_iata = p_airport_iata
    and f.active_until > now()
    and p.id <> auth.uid()
    and not p.is_banned
    -- not blocked either way
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    -- not already swiped on
    and not exists (
      select 1 from public.swipes sw
      where sw.swiper_id = auth.uid() and sw.swipee_id = p.id
    )
  order by
    case coalesce(s.tier, 'standby'::subscription_tier)
      when 'first_class' then 0
      when 'regular'     then 1
      else 2 end,
    p.last_seen_at desc
  limit p_limit;
$$;

grant execute on function public.discover_at_airport(text, int) to authenticated;

-- mark_message_read -----------------------------------------------------------
-- Only First Class subscribers can stamp read_at on messages they've read.
create or replace function public.mark_message_read(p_message_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match_id uuid;
  v_sender   uuid;
  v_tier     subscription_tier;
begin
  select m.match_id, m.sender_id into v_match_id, v_sender
  from public.messages m where m.id = p_message_id;
  if v_match_id is null then
    raise exception 'message not found';
  end if;

  -- caller must be a participant and not the sender
  if not exists (
    select 1 from public.matches mt
    where mt.id = v_match_id
      and auth.uid() in (mt.user_a_id, mt.user_b_id)
  ) or v_sender = auth.uid() then
    raise exception 'not authorized';
  end if;

  -- caller must be First Class
  select tier into v_tier from public.subscriptions
  where user_id = auth.uid() and is_active
    and (expires_at is null or expires_at > now());
  if v_tier is distinct from 'first_class' then
    return;  -- silently no-op; receipts are a paid feature
  end if;

  update public.messages
  set read_at = coalesce(read_at, now())
  where id = p_message_id;
end $$;

grant execute on function public.mark_message_read(uuid) to authenticated;

-- get_my_subscription_tier ----------------------------------------------------
create or replace function public.get_my_subscription_tier()
returns subscription_tier
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select tier from public.subscriptions
     where user_id = auth.uid() and is_active
       and (expires_at is null or expires_at > now())
     limit 1),
    'standby'::subscription_tier
  );
$$;

grant execute on function public.get_my_subscription_tier() to authenticated;

-- touch_last_seen -------------------------------------------------------------
-- Called on app foreground to keep the discover ranking fresh.
create or replace function public.touch_last_seen()
returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function public.touch_last_seen() to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  migrations/20260505000004_storage_realtime.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- FlyBye — Storage buckets + Realtime publication
-- ============================================================================

-- Buckets ---------------------------------------------------------------------
-- avatars: public read; writes are own-folder only
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- verifications: private; only owner can write, only service role can read
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- avatars policies ------------------------------------------------------------
drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- verifications policies ------------------------------------------------------
drop policy if exists "verifications_write_own" on storage.objects;
create policy "verifications_write_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verifications_read_own" on storage.objects;
create policy "verifications_read_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- (No public read; reviewers use the service role via the admin dashboard.)

-- Realtime --------------------------------------------------------------------
-- Allow Flutter clients to subscribe to messages in their matches.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>  seed/airports_seed.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Top hub airports — enough to test the discover flow.
-- Expand later with the full OurAirports CSV.
-- ============================================================================

insert into public.airports (iata_code, icao_code, name, city, country, timezone, latitude, longitude) values
  ('ATL','KATL','Hartsfield-Jackson Atlanta International','Atlanta','US','America/New_York',33.6407,-84.4277),
  ('JFK','KJFK','John F. Kennedy International','New York','US','America/New_York',40.6413,-73.7781),
  ('LGA','KLGA','LaGuardia','New York','US','America/New_York',40.7769,-73.8740),
  ('EWR','KEWR','Newark Liberty International','Newark','US','America/New_York',40.6895,-74.1745),
  ('LAX','KLAX','Los Angeles International','Los Angeles','US','America/Los_Angeles',33.9416,-118.4085),
  ('ORD','KORD','O''Hare International','Chicago','US','America/Chicago',41.9742,-87.9073),
  ('DFW','KDFW','Dallas/Fort Worth International','Dallas','US','America/Chicago',32.8998,-97.0403),
  ('DEN','KDEN','Denver International','Denver','US','America/Denver',39.8561,-104.6737),
  ('SFO','KSFO','San Francisco International','San Francisco','US','America/Los_Angeles',37.6213,-122.3790),
  ('SEA','KSEA','Seattle-Tacoma International','Seattle','US','America/Los_Angeles',47.4502,-122.3088),
  ('MIA','KMIA','Miami International','Miami','US','America/New_York',25.7959,-80.2870),
  ('BOS','KBOS','Boston Logan International','Boston','US','America/New_York',42.3656,-71.0096),
  ('PHX','KPHX','Phoenix Sky Harbor International','Phoenix','US','America/Phoenix',33.4342,-112.0116),
  ('IAH','KIAH','George Bush Intercontinental','Houston','US','America/Chicago',29.9902,-95.3368),
  ('IAD','KIAD','Washington Dulles International','Washington','US','America/New_York',38.9531,-77.4565),
  ('DCA','KDCA','Ronald Reagan National','Washington','US','America/New_York',38.8512,-77.0402),
  ('MCO','KMCO','Orlando International','Orlando','US','America/New_York',28.4312,-81.3081),
  ('LAS','KLAS','Harry Reid International','Las Vegas','US','America/Los_Angeles',36.0840,-115.1537),
  ('MSP','KMSP','Minneapolis-St. Paul International','Minneapolis','US','America/Chicago',44.8848,-93.2223),
  ('DTW','KDTW','Detroit Metropolitan Wayne County','Detroit','US','America/New_York',42.2162,-83.3554),
  ('PHL','KPHL','Philadelphia International','Philadelphia','US','America/New_York',39.8744,-75.2424),
  ('SAN','KSAN','San Diego International','San Diego','US','America/Los_Angeles',32.7338,-117.1933),
  ('CLT','KCLT','Charlotte Douglas International','Charlotte','US','America/New_York',35.2144,-80.9473),
  ('SLC','KSLC','Salt Lake City International','Salt Lake City','US','America/Denver',40.7899,-111.9791),
  ('AUS','KAUS','Austin-Bergstrom International','Austin','US','America/Chicago',30.1975,-97.6664),
  ('LHR','EGLL','Heathrow','London','GB','Europe/London',51.4700,-0.4543),
  ('LGW','EGKK','Gatwick','London','GB','Europe/London',51.1537,-0.1821),
  ('CDG','LFPG','Charles de Gaulle','Paris','FR','Europe/Paris',49.0097,2.5479),
  ('AMS','EHAM','Amsterdam Schiphol','Amsterdam','NL','Europe/Amsterdam',52.3105,4.7683),
  ('FRA','EDDF','Frankfurt','Frankfurt','DE','Europe/Berlin',50.0379,8.5622),
  ('MUC','EDDM','Munich','Munich','DE','Europe/Berlin',48.3537,11.7750),
  ('MAD','LEMD','Adolfo Suárez Madrid-Barajas','Madrid','ES','Europe/Madrid',40.4839,-3.5680),
  ('BCN','LEBL','Barcelona-El Prat','Barcelona','ES','Europe/Madrid',41.2974,2.0833),
  ('FCO','LIRF','Leonardo da Vinci-Fiumicino','Rome','IT','Europe/Rome',41.8003,12.2389),
  ('IST','LTFM','Istanbul','Istanbul','TR','Europe/Istanbul',41.2753,28.7519),
  ('DXB','OMDB','Dubai International','Dubai','AE','Asia/Dubai',25.2532,55.3657),
  ('DOH','OTHH','Hamad International','Doha','QA','Asia/Qatar',25.2731,51.6080),
  ('SIN','WSSS','Changi','Singapore','SG','Asia/Singapore',1.3644,103.9915),
  ('HKG','VHHH','Hong Kong International','Hong Kong','HK','Asia/Hong_Kong',22.3080,113.9185),
  ('NRT','RJAA','Narita International','Tokyo','JP','Asia/Tokyo',35.7720,140.3929),
  ('HND','RJTT','Tokyo Haneda','Tokyo','JP','Asia/Tokyo',35.5494,139.7798),
  ('ICN','RKSI','Incheon International','Seoul','KR','Asia/Seoul',37.4602,126.4407),
  ('PEK','ZBAA','Beijing Capital','Beijing','CN','Asia/Shanghai',40.0801,116.5846),
  ('PVG','ZSPD','Shanghai Pudong','Shanghai','CN','Asia/Shanghai',31.1443,121.8083),
  ('SYD','YSSY','Sydney Kingsford Smith','Sydney','AU','Australia/Sydney',-33.9399,151.1753),
  ('MEL','YMML','Melbourne','Melbourne','AU','Australia/Melbourne',-37.6690,144.8410),
  ('YYZ','CYYZ','Toronto Pearson','Toronto','CA','America/Toronto',43.6777,-79.6248),
  ('YVR','CYVR','Vancouver International','Vancouver','CA','America/Vancouver',49.1939,-123.1844),
  ('GRU','SBGR','São Paulo-Guarulhos','São Paulo','BR','America/Sao_Paulo',-23.4356,-46.4731),
  ('MEX','MMMX','Mexico City','Mexico City','MX','America/Mexico_City',19.4361,-99.0719)
on conflict (iata_code) do nothing;

