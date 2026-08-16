-- Live location shares (terminal/zone only, visible to accepted matches)
CREATE TABLE public.location_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  airport TEXT NOT NULL,
  terminal TEXT,
  zone TEXT,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

-- Owner can fully manage their own row
CREATE POLICY "Users manage own location share"
ON public.location_shares
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Accepted matches can read the active share
CREATE POLICY "Accepted matches can view active share"
ON public.location_shares
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.status = 'accepted'
      AND (
        (m.requester_id = auth.uid() AND m.target_id = location_shares.user_id)
        OR (m.target_id = auth.uid() AND m.requester_id = location_shares.user_id)
      )
  )
);

CREATE TRIGGER update_location_shares_updated_at
BEFORE UPDATE ON public.location_shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_location_shares_user ON public.location_shares(user_id);
CREATE INDEX idx_location_shares_airport_active ON public.location_shares(airport) WHERE is_active = true;