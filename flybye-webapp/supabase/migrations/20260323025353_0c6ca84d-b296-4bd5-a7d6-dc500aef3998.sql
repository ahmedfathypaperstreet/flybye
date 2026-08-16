-- Add more fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_style TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[],
  ADD COLUMN IF NOT EXISTS home_airport TEXT,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Create flights table
CREATE TABLE public.flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_number TEXT,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  layover_airport TEXT,
  layover_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flights of others" ON public.flights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own flights" ON public.flights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flights" ON public.flights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flights" ON public.flights FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_flights_user ON public.flights(user_id);
CREATE INDEX idx_flights_departure ON public.flights(departure_airport, departure_time);
CREATE INDEX idx_flights_layover ON public.flights(layover_airport) WHERE layover_airport IS NOT NULL;

CREATE TRIGGER update_flights_updated_at
  BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create matches table
CREATE TYPE public.match_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.match_status NOT NULL DEFAULT 'pending',
  airport TEXT,
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_match CHECK (requester_id != target_id),
  CONSTRAINT unique_match UNIQUE (requester_id, target_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Users can create match requests" ON public.matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update matches they received" ON public.matches FOR UPDATE TO authenticated
  USING (auth.uid() = target_id);

CREATE INDEX idx_matches_requester ON public.matches(requester_id);
CREATE INDEX idx_matches_target ON public.matches(target_id);
CREATE INDEX idx_matches_status ON public.matches(status);

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();