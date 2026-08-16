import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_flights",
  title: "List my flights",
  description: "List the signed-in traveler's saved flights and layovers, soonest departure first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Maximum number of flights to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("flights")
      .select("id, flight_number, departure_airport, departure_time, arrival_airport, arrival_time, layover_airport, layover_duration_minutes")
      .eq("user_id", ctx.getUserId())
      .order("departure_time", { ascending: true })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { flights: data ?? [] },
    };
  },
});
