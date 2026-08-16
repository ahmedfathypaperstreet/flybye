
-- ============================================================
-- 1. PROFILES: restrict full table to owner; expose safe view
-- ============================================================

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public-safe view excluding verification details
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
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
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Add a permissive SELECT policy on the base table for the view to work
-- under security_invoker. We handle column safety by always querying
-- the view from the client. The view itself (security_invoker) runs as
-- the calling user, so we need an additional policy that lets
-- authenticated users read the public-safe rows. We accomplish this with
-- a column-restricted approach: keep owner-only on base, and grant view
-- access via a SECURITY DEFINER policy bypass through the view definer.
-- Switch view to definer security so it can read across users while
-- only exposing safe columns:
ALTER VIEW public.profiles_public SET (security_invoker = off);

-- ============================================================
-- 2. FLIGHTS: restrict to owner OR airport overlap with my flights
-- ============================================================

-- SECURITY DEFINER helper: does the current user have an upcoming flight
-- that touches any of the given airport codes?
CREATE OR REPLACE FUNCTION public.user_shares_airport(_airports text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.flights f
    WHERE f.user_id = auth.uid()
      AND f.departure_time >= (now() - interval '1 day')
      AND (
        f.departure_airport = ANY(_airports)
        OR f.arrival_airport = ANY(_airports)
        OR f.layover_airport = ANY(_airports)
      )
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can view flights" ON public.flights;

CREATE POLICY "Users can view own flights"
  ON public.flights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view flights sharing an airport"
  ON public.flights
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() <> user_id
    AND public.user_shares_airport(
      ARRAY[departure_airport, arrival_airport, layover_airport]::text[]
    )
  );
