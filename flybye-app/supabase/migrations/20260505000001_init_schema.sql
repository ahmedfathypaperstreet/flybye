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
