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
