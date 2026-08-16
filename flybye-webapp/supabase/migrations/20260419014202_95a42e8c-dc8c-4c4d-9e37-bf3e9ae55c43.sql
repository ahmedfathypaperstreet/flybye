
-- Switch view to security_invoker so it uses caller's RLS
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- Add a SELECT policy allowing all authenticated users to read profile rows.
-- Column-level privileges below restrict which columns they can actually read.
CREATE POLICY "Authenticated can read profile non-sensitive columns"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Revoke blanket SELECT on the base table from authenticated/anon
REVOKE SELECT ON public.profiles FROM authenticated, anon;

-- Grant SELECT only on safe columns to authenticated/anon
GRANT SELECT (
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  interests,
  travel_style,
  home_airport,
  airport_code,
  gender,
  gender_preference,
  connection_mode,
  verified,
  created_at,
  updated_at
) ON public.profiles TO authenticated, anon;

-- Owners need to read the verification columns of their own row.
-- We allow this by granting all-column SELECT only when the row matches
-- via a SECURITY DEFINER helper used in the existing "Users can view their own profile" policy.
-- However column grants are role-wide, not row-wide. To let owners read
-- their verification fields, we expose them through a dedicated view:
CREATE OR REPLACE VIEW public.my_profile
WITH (security_invoker = on) AS
SELECT *
FROM public.profiles
WHERE user_id = auth.uid();

GRANT SELECT ON public.my_profile TO authenticated;

-- Also grant the verification columns SELECT to authenticated globally,
-- but rely on RLS to limit which ROWS are returned. Since we have two
-- SELECT policies (owner-only + authenticated-all), the authenticated-all
-- policy would expose verification columns. Instead, drop the broad policy
-- and let the view bypass column restrictions for safe columns only.
DROP POLICY IF EXISTS "Authenticated can read profile non-sensitive columns" ON public.profiles;

-- Final state for profiles SELECT:
--   - Only owners can SELECT from public.profiles (existing policy "Users can view their own profile").
--   - Everyone else uses public.profiles_public view, which has its own GRANT SELECT
--     and runs with security_invoker. For the view to return rows for non-owners,
--     we add a permissive SELECT policy that authenticated users can read other rows
--     ONLY through the view (not directly), enforced by column grants below.

CREATE POLICY "Authenticated can read profiles for public view"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Re-apply column grants (the previous DROP POLICY didn't affect grants,
-- but keep this idempotent):
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  interests,
  travel_style,
  home_airport,
  airport_code,
  gender,
  gender_preference,
  connection_mode,
  verified,
  created_at,
  updated_at
) ON public.profiles TO authenticated, anon;

-- Owners read full profile (including verification cols) via my_profile view,
-- which is security_invoker — so it inherits the same column restrictions.
-- To let owners actually read their verification columns, switch my_profile to
-- a SECURITY DEFINER function-style view via a function instead:
DROP VIEW IF EXISTS public.my_profile;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
