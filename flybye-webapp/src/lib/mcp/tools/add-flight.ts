import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const airport = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Use a 3-letter IATA airport code")
  .transform((v) => v.toUpperCase());

export default defineTool({
  name: "add_flight",
  title: "Add a flight",
  description: "Save a flight (with optional layover) to the signed-in traveler's FlyBye itinerary.",
  inputSchema: {
    departure_airport: airport.describe("Departure airport IATA code, e.g. JFK."),
    arrival_airport: airport.describe("Arrival airport IATA code, e.g. LHR."),
    departure_time: z.string().datetime({ offset: true }).describe("Departure time as an ISO 8601 timestamp."),
    arrival_time: z.string().datetime({ offset: true }).describe("Arrival time as an ISO 8601 timestamp."),
    flight_number: z.string().trim().max(12).optional().describe("Flight number, e.g. BA178."),
    layover_airport: airport.optional().describe("Layover airport IATA code, if any."),
    layover_duration_minutes: z.number().int().min(0).max(2880).optional().describe("Layover length in minutes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("flights")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Flight saved: ${data.departure_airport} → ${data.arrival_airport}` }],
      structuredContent: { flight: data },
    };
  },
});
