import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import defaultAvatar from "@/assets/default-avatar.png";
import { cacheTravelers, getCachedTravelers } from "@/lib/offlineCache";
import type { Tables } from "@/integrations/supabase/types";

type ProfileRow = Tables<"profiles">;

export interface DiscoverProfile {
  id: string;
  name: string;
  photo: string;
  role: string | null;
  company: string | null;
  industry: string | null;
  intent: ProfileRow["intent"];
  verified: boolean;
  bio: string;
  airport: string | null;
}

function mapProfile(p: ProfileRow): DiscoverProfile {
  return {
    id: p.id,
    name: p.display_name || "Professional",
    photo: p.avatar_url ?? defaultAvatar,
    role: p.role ?? null,
    company: p.company ?? null,
    industry: p.industry ?? null,
    intent: p.intent ?? null,
    verified: p.verified,
    bio: p.bio ?? "",
    airport: p.current_airport ?? p.home_airport ?? null,
  };
}

export function useTravelers() {
  const { user } = useAuth();
  const [travelers, setTravelers] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTravelers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Offline: hydrate from IndexedDB and bail
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await getCachedTravelers<DiscoverProfile>();
      setTravelers(cached);
      setLoading(false);
      return;
    }

    // Verified professionals at MY current airport, right now.
    const { data, error } = await supabase.rpc("discover_at_airport");

    if (error) {
      console.error("Error fetching travelers:", error);
      setLoading(false);
      return;
    }

    const mapped = ((data as ProfileRow[]) ?? []).map(mapProfile);
    setTravelers(mapped);
    cacheTravelers(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTravelers();
  }, [fetchTravelers]);

  return {
    travelers,
    loading,
    refresh: fetchTravelers,
  };
}
