import { supabase } from "@/integrations/supabase/client";

/**
 * Mirror a user's active flight leg into their profile presence so that
 * `discover_at_airport()` can surface them to other travelers at the same
 * airport. Discovery relies on `profiles.current_airport` + `present_until`.
 *
 * We pick the layover airport when there is one (that's where they'll be
 * hanging around), otherwise the departure airport. The presence window ends
 * at the flight's arrival time.
 */
export async function updatePresenceFromFlight(
  userId: string,
  flight: {
    departure_airport: string;
    arrival_airport: string;
    arrival_time: string;
    layover_airport?: string | null;
  },
): Promise<void> {
  const currentAirport = flight.layover_airport?.trim() || flight.departure_airport;
  await supabase
    .from("profiles")
    .update({
      current_airport: currentAirport,
      present_until: flight.arrival_time,
    })
    .eq("id", userId);
}
