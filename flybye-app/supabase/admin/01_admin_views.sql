-- ============================================================================
-- FlyBye — admin helpers (run once, optional)
-- ============================================================================
-- Convenience views + RPCs for moderating verification queue and reports.
-- Intended to be called by you (the operator) via the Supabase SQL editor or
-- a tiny CLI; never exposed to authenticated end users.
-- ============================================================================

-- pending_verifications: queue of selfies awaiting review --------------------
create or replace view public.pending_verifications as
select
  vr.id,
  vr.user_id,
  p.display_name,
  p.birthdate,
  vr.selfie_url,         -- storage path: <user_id>/<timestamp>.jpg
  vr.created_at
from public.verification_requests vr
join public.profiles p on p.id = vr.user_id
where vr.status = 'pending'
order by vr.created_at;

comment on view public.pending_verifications is
  'Selfies awaiting manual review. Preview the file in Supabase dashboard → Storage → verifications, or use `./scripts/admin.sh preview <user_uuid>` to download it.';

-- approve_verification(user_id) ----------------------------------------------
create or replace function public.approve_verification(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.verification_requests
     set status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where user_id = p_user_id
     and status = 'pending';
end $$;

-- reject_verification(user_id, reason) ---------------------------------------
create or replace function public.reject_verification(p_user_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.verification_requests
     set status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         rejection_reason = p_reason
   where user_id = p_user_id
     and status = 'pending';
end $$;

-- open_reports: moderation queue --------------------------------------------
create or replace view public.open_reports as
select
  r.id,
  r.created_at,
  r.reason,
  r.details,
  reporter.display_name  as reporter_name,
  reporter.id            as reporter_id,
  reported.display_name  as reported_name,
  reported.id            as reported_id,
  reported.is_verified   as reported_is_verified,
  reported.is_banned     as reported_is_banned
from public.reports r
join public.profiles reporter on reporter.id = r.reporter_id
join public.profiles reported on reported.id = r.reported_id
where r.status = 'open'
order by r.created_at;

-- ban_user / unban_user ------------------------------------------------------
create or replace function public.ban_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set is_banned = true where id = p_user_id;
  update public.reports set status = 'resolved'
   where reported_id = p_user_id and status = 'open';
end $$;

create or replace function public.unban_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set is_banned = false where id = p_user_id;
end $$;

-- resolve_report(id, action) -------------------------------------------------
-- action ∈ ('resolved', 'dismissed')
create or replace function public.resolve_report(p_report_id uuid, p_action report_status)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_action not in ('resolved', 'dismissed') then
    raise exception 'action must be resolved or dismissed';
  end if;
  update public.reports set status = p_action where id = p_report_id;
end $$;
