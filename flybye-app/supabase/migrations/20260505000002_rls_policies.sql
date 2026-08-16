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
