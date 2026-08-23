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
