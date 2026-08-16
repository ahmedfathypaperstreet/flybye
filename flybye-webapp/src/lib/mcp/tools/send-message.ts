import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "send_message",
  title: "Send a message",
  description: "Send a text message as the signed-in professional in one of their FlyBye conversations.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation ID to send the message in."),
    body: z.string().trim().min(1).max(2000).describe("Message text to send."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ conversation_id, body }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id, body, sender_id: ctx.getUserId() })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: "Message sent." }],
      structuredContent: { message: data },
    };
  },
});
