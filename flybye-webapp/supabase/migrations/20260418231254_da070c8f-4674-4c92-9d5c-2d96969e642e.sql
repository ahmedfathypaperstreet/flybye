-- 1. Add verification fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS verification_inquiry_id text,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Constrain verification_status to known values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('none', 'pending', 'approved', 'declined', 'needs_review', 'expired'));

-- 2. Attestations table — legal acceptance ledger
CREATE TABLE IF NOT EXISTS public.attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  age_confirmed boolean NOT NULL DEFAULT false,
  truthful_info boolean NOT NULL DEFAULT false,
  accepted_legal_bundle boolean NOT NULL DEFAULT false,
  understands_no_background_checks boolean NOT NULL DEFAULT false,
  agrees_safe_meeting boolean NOT NULL DEFAULT false,
  consents_to_id_verification boolean NOT NULL DEFAULT false,
  acknowledges_arbitration boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  terms_version text NOT NULL DEFAULT '2026-04-02',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attestation"
  ON public.attestations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role (via edge function) can insert/update — preserves IP/user-agent integrity
CREATE POLICY "Service role manages attestations"
  ON public.attestations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_attestations_updated_at
  BEFORE UPDATE ON public.attestations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Airports reference table
CREATE TABLE IF NOT EXISTS public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata text NOT NULL UNIQUE,
  icao text,
  name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  bbox_min_lat double precision,
  bbox_min_lon double precision,
  bbox_max_lat double precision,
  bbox_max_lon double precision,
  timezone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airports_iata ON public.airports(iata);

ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Airports are publicly readable"
  ON public.airports FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role manages airports"
  ON public.airports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_airports_updated_at
  BEFORE UPDATE ON public.airports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Cached POI data (Overpass API) per airport+category, refreshed every 24h
CREATE TABLE IF NOT EXISTS public.airport_pois_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata text NOT NULL,
  category text NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(iata, category)
);

CREATE INDEX IF NOT EXISTS idx_pois_cache_lookup ON public.airport_pois_cache(iata, category);

ALTER TABLE public.airport_pois_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POI cache is publicly readable"
  ON public.airport_pois_cache FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role manages POI cache"
  ON public.airport_pois_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');