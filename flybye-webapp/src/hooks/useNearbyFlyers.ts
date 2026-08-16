import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AirportCount {
  airport: string;
  count: number;
}

export function useNearbyFlyers() {
  const { user } = useAuth();
  const [userAirport, setUserAirport] = useState<string | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchNearbyCount = async () => {
      // Get the current user's airport (from upcoming flight or home_airport)
      const { data: flight } = await supabase
        .from("flights")
        .select("departure_airport, layover_airport")
        .eq("user_id", user.id)
        .gte("departure_time", new Date().toISOString())
        .order("departure_time", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("home_airport")
        .eq("id", user.id)
        .maybeSingle();

      const airport = flight?.layover_airport ?? flight?.departure_airport ?? profile?.home_airport;
      setUserAirport(airport ?? null);

      if (!airport) {
        setLoading(false);
        return;
      }

      // Count other users at this airport (via flights or home_airport)
      const [{ count: flightCount }, { count: homeCount }] = await Promise.all([
        supabase
          .from("flights")
          .select("user_id", { count: "exact", head: true })
          .neq("user_id", user.id)
          .gte("departure_time", new Date().toISOString())
          .or(`departure_airport.eq.${airport},layover_airport.eq.${airport},arrival_airport.eq.${airport}`),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .neq("id", user.id)
          .eq("home_airport", airport),
      ]);

      // Combine (may overlap but gives a general sense)
      const total = Math.max(flightCount ?? 0, homeCount ?? 0);
      setNearbyCount(total);
      setLoading(false);
    };

    fetchNearbyCount();
  }, [user]);

  return { userAirport, nearbyCount, loading };
}
