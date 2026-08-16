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
