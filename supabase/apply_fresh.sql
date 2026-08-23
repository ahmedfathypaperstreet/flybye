-- ============================================================================
-- FlyBye — UNIFIED canonical schema (business networking)
-- Shared by the web (flybye-webapp) and mobile (flybye) apps.
-- Target project: pngjuliouszzhylkimsd
--
-- HOW TO APPLY: Supabase Dashboard -> SQL Editor -> New query -> paste ALL ->
-- Run. Safe to run on an EMPTY project. Mostly idempotent.
-- After running: seed airports (section 12), and add the auth redirect URL
-- flybye://reset-password (mobile) + your web origin under Auth -> URL Config.
-- ============================================================================

-- 0. RESET  ⚠️ DESTRUCTIVE ----------------------------------------------------
-- Drops the pre-existing (Lovable/pre-pivot) tables so the unified schema can be
-- created clean. SAFE on this fresh project (no real users/data). If you ever run
-- this against a project WITH data you care about, remove this section first.
drop table if exists
  public.messages, public.conversations, public.matches, public.swipes,
  public.location_shares, public.reports, public.blocks,
  public.verification_requests, public.attestations, public.subscriptions,
  public.flights, public.airport_pois_cache, public.airports,
  public.email_send_log, public.email_send_state, public.email_unsubscribe_tokens,
  public.suppressed_emails, public.profiles
  cascade;

drop type if exists
  public.networking_intent, public.verification_status, public.report_status,
  public.match_status, public.swipe_direction, public.subscription_tier
  cascade;

-- 1. Extensions --------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 2. Enums -------------------------------------------------------------------
do $$ begin
  create type networking_intent as enum ('hiring','partnerships','mentorship','networking');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('none','pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open','reviewing','resolved','dismissed');
exception when duplicate_object then null; end $$;

-- 3. updated_at helper -------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ============================================================================
-- 4. profiles  (1-to-1 with auth.users: profiles.id = auth.users.id)
-- ============================================================================
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null default '' check (char_length(display_name) <= 60),
  avatar_url       text,                                   -- storage path in `avatars`
  bio              text check (char_length(bio) <= 400),
  -- business identity
  role             text,                                   -- e.g. "Product Lead"
  company          text,
  industry         text,
  intent           networking_intent,
  linkedin_url     text,
  -- travel / presence
  home_airport     text,
  current_airport  text,                                   -- IATA the user is at NOW
  present_until    timestamptz,                            -- discovery window end
  -- trust
  verified         boolean not null default false,
  verification_status verification_status not null default 'none',
  is_banned        boolean not null default false,
  -- meta
  last_seen_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists profiles_presence_idx
  on public.profiles (current_airport, present_until)
  where current_airport is not null;
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create a profile shell on signup; app onboarding fills the rest.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. airports  (reference data — seed separately, section 12)
-- ============================================================================
create table if not exists public.airports (
  iata_code text primary key check (char_length(iata_code) = 3),
  icao_code text,
  name      text not null,
  city      text not null,
  country   text not null,
  timezone  text,
  latitude  double precision,
  longitude double precision
);
create index if not exists airports_city_trgm_idx on public.airports using gin (lower(city) gin_trgm_ops);
create index if not exists airports_name_trgm_idx on public.airports using gin (lower(name) gin_trgm_ops);

-- ============================================================================
-- 6. flights  (itinerary; the app also mirrors the active leg into
--    profiles.current_airport / present_until for fast discovery)
-- ============================================================================
create table if not exists public.flights (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  flight_number            text,
  departure_airport        text not null,
  arrival_airport          text not null,
  departure_time           timestamptz not null,
  arrival_time             timestamptz not null,
  layover_airport          text,
  layover_duration_minutes integer,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists flights_user_idx on public.flights (user_id);
create index if not exists flights_layover_idx on public.flights (layover_airport);

drop trigger if exists flights_set_updated_at on public.flights;
create trigger flights_set_updated_at before update on public.flights
  for each row execute function public.tg_set_updated_at();

-- ============================================================================
-- 7. conversations  (OPEN DM — canonical pair user_a_id < user_b_id,
--    created on first message; NO request/accept, NO mutual-like)
-- ============================================================================
create table if not exists public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  user_a_id       uuid not null references public.profiles(id) on delete cascade,
  user_b_id       uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  unique (user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);
create index if not exists conversations_a_idx on public.conversations (user_a_id, last_message_at desc);
create index if not exists conversations_b_idx on public.conversations (user_b_id, last_message_at desc);

-- ============================================================================
-- 8. messages  (realtime)
-- ============================================================================
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.tg_bump_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation after insert on public.messages
  for each row execute function public.tg_bump_conversation();

-- ============================================================================
-- 9. blocks + reports  (safety / app-store compliance)
-- ============================================================================
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id          uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  details     text,
  status      report_status not null default 'open',
  created_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at);

-- ============================================================================
-- 10. verification_requests  (government-ID upload -> review -> verified)
-- ============================================================================
create table if not exists public.verification_requests (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null unique references public.profiles(id) on delete cascade,
  document_url     text not null,                          -- path in `id-documents` bucket
  status           verification_status not null default 'pending',
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now()
);
create index if not exists verification_status_idx on public.verification_requests (status, created_at);

create or replace function public.tg_apply_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update public.profiles set verified = true, verification_status = 'approved' where id = new.user_id;
  elsif new.status = 'rejected' and (old.status is distinct from 'rejected') then
    update public.profiles set verified = false, verification_status = 'rejected' where id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists verification_apply on public.verification_requests;
create trigger verification_apply after update on public.verification_requests
  for each row execute function public.tg_apply_verification();

-- ============================================================================
-- 11. location_shares (live lounge/terminal presence) + airport_pois_cache
-- ============================================================================
create table if not exists public.location_shares (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null unique references public.profiles(id) on delete cascade,
  airport      text not null,
  terminal     text,
  zone         text,
  note         text,
  is_active    boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists location_shares_airport_active_idx on public.location_shares (airport, is_active);

drop trigger if exists location_shares_set_updated_at on public.location_shares;
create trigger location_shares_set_updated_at before update on public.location_shares
  for each row execute function public.tg_set_updated_at();

create table if not exists public.airport_pois_cache (
  iata       text not null,
  category   text not null,
  data       jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (iata, category)
);
create index if not exists airport_pois_cache_lookup on public.airport_pois_cache (iata, category);

-- ============================================================================
-- 12. RLS
-- ============================================================================
alter table public.profiles              enable row level security;
alter table public.airports              enable row level security;
alter table public.flights               enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.blocks                enable row level security;
alter table public.reports               enable row level security;
alter table public.verification_requests enable row level security;
alter table public.location_shares       enable row level security;
alter table public.airport_pois_cache    enable row level security;

-- profiles: any authenticated user can browse (browse-before-verify); manage own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id);

-- airports / poi cache: public read.
drop policy if exists airports_read on public.airports;
create policy airports_read on public.airports for select using (true);
drop policy if exists pois_read on public.airport_pois_cache;
create policy pois_read on public.airport_pois_cache for select using (true);

-- flights: everyone authenticated can read (needed for discovery/context); manage own.
drop policy if exists flights_read on public.flights;
create policy flights_read on public.flights for select to authenticated using (true);
drop policy if exists flights_write_own on public.flights;
create policy flights_write_own on public.flights for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conversations: only participants can see; inserts go through the RPC (verified gate there).
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- messages: participants can read; sender must be a VERIFIED participant (browse-first, verify-to-message).
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c
          where c.id = conversation_id and (auth.uid() = c.user_a_id or auth.uid() = c.user_b_id))
);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (
  auth.uid() = sender_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.verified = true)
  and exists (select 1 from public.conversations c
              where c.id = conversation_id and (auth.uid() = c.user_a_id or auth.uid() = c.user_b_id))
  and not exists (
    select 1 from public.blocks b
    join public.conversations c on c.id = conversation_id
    where (b.blocker_id = c.user_a_id and b.blocked_id = c.user_b_id)
       or (b.blocker_id = c.user_b_id and b.blocked_id = c.user_a_id)
  )
);

-- blocks / reports: user manages own.
drop policy if exists blocks_manage_own on public.blocks;
create policy blocks_manage_own on public.blocks for all to authenticated
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports for select to authenticated using (auth.uid() = reporter_id);

-- verification_requests: user manages own (review done via service role).
drop policy if exists vr_manage_own on public.verification_requests;
create policy vr_manage_own on public.verification_requests for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- location_shares: owner manages own; others read active shares.
drop policy if exists ls_manage_own on public.location_shares;
create policy ls_manage_own on public.location_shares for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists ls_read_active on public.location_shares;
create policy ls_read_active on public.location_shares for select to authenticated using (is_active = true);

-- ============================================================================
-- 13. RPCs
-- ============================================================================
-- Discover verified people at MY current airport, right now (excludes me, blocked, banned).
create or replace function public.discover_at_airport()
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select p.*
  from public.profiles p
  join public.profiles me on me.id = auth.uid()
  where p.id <> auth.uid()
    and p.is_banned = false
    and me.current_airport is not null
    and p.current_airport = me.current_airport
    and (p.present_until is null or p.present_until > now())
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
                       or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
  order by p.verified desc, p.last_seen_at desc;
$$;

-- Open a DM (create the canonical conversation if needed). Caller must be verified.
create or replace function public.get_or_create_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; cid uuid;
begin
  if other = auth.uid() then raise exception 'cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and verified = true) then
    raise exception 'verify your identity to start a conversation';
  end if;
  if exists (select 1 from public.blocks
             where (blocker_id = auth.uid() and blocked_id = other)
                or (blocker_id = other and blocked_id = auth.uid())) then
    raise exception 'conversation not allowed';
  end if;
  if auth.uid() < other then a := auth.uid(); b := other; else a := other; b := auth.uid(); end if;
  insert into public.conversations (user_a_id, user_b_id) values (a, b)
    on conflict (user_a_id, user_b_id) do nothing;
  select id into cid from public.conversations where user_a_id = a and user_b_id = b;
  return cid;
end $$;

-- Mark all messages in a conversation as read (for the current user's counterpart's messages).
create or replace function public.mark_conversation_read(conv uuid)
returns void language sql security definer set search_path = public as $$
  update public.messages set read_at = now()
  where conversation_id = conv and sender_id <> auth.uid() and read_at is null
    and exists (select 1 from public.conversations c
                where c.id = conv and (auth.uid() = c.user_a_id or auth.uid() = c.user_b_id));
$$;

-- Touch presence heartbeat.
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function public.discover_at_airport() to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.touch_last_seen() to authenticated;

-- ============================================================================
-- 14. Storage buckets + policies
-- ============================================================================
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('id-documents','id-documents', false)
  on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists iddocs_write_own on storage.objects;
create policy iddocs_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists iddocs_read_own on storage.objects;
create policy iddocs_read_own on storage.objects for select to authenticated
  using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 15. Realtime
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.location_shares;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- DONE (schema). The airports seed is appended below in the combined file
-- `supabase_apply.sql`. After applying, set Auth -> URL Configuration redirect
-- URLs: flybye://reset-password  and your web origin.
-- ============================================================================

-- ============================================================================
-- 16. AIRPORTS SEED (50 major airports) — columns match section 5
-- ============================================================================
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

-- ============================================================================
-- In-app account deletion  (Apple 5.1.1(v) + Google Play requirement)
-- ============================================================================
-- Deletes the CALLER's auth user. FK `on delete cascade` from profiles →
-- auth.users then removes their profile and every owned row (flights,
-- conversations, messages, blocks, reports, verification_requests,
-- location_shares). Storage objects don't cascade, so clean those first.
-- SECURITY DEFINER runs as the function owner (postgres), which may delete
-- from auth.users; callers can only ever delete themselves (auth.uid()).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- best-effort: remove the user's files from both buckets
  delete from storage.objects
   where bucket_id in ('avatars', 'id-documents')
     and (storage.foldername(name))[1] = uid::text;

  -- delete the auth user → cascades to public.profiles and all owned rows
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
