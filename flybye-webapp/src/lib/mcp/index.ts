import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyFlights from "./tools/list-my-flights";
import addFlight from "./tools/add-flight";
import listConversations from "./tools/list-my-matches";
import listMessages from "./tools/list-messages";
import sendMessage from "./tools/send-message";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "flybye",
  title: "FlyBye",
  version: "0.1.0",
  instructions:
    "Tools for FlyBye, a business-networking app for professionals traveling through airports. Read and manage the signed-in professional's profile, flights and layovers, conversations, and chat messages. All tools act as the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyFlights, addFlight, listConversations, listMessages, sendMessage],
});
