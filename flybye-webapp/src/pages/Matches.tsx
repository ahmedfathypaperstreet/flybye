import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Pick<
  Tables<"profiles">,
  "id" | "display_name" | "avatar_url" | "role" | "company"
>;

interface ConversationWithProfile {
  id: string;
  last_message_at: string | null;
  otherId: string;
  profile: Profile | null;
  lastMessage: string | null;
}

const Conversations = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("conversations")
      .select("id, user_a_id, user_b_id, last_message_at")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      toast({ title: "Error loading conversations", variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const otherIds = rows.map((c) =>
      c.user_a_id === user.id ? c.user_b_id : c.user_a_id,
    );

    const [{ data: profiles }, lastMessages] = await Promise.all([
      otherIds.length
        ? supabase
            .from("profiles")
            .select("id, display_name, avatar_url, role, company")
            .in("id", otherIds)
        : Promise.resolve({ data: [] as Profile[] }),
      // Fetch the latest message body per conversation (one round-trip each).
      Promise.all(
        rows.map(async (c) => {
          const { data: msg } = await supabase
            .from("messages")
            .select("body")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return { id: c.id, body: msg?.body ?? null };
        }),
      ),
    ]);

    const profileMap = new Map(
      ((profiles as Profile[]) ?? []).map((p) => [p.id, p]),
    );
    const lastMsgMap = new Map(lastMessages.map((m) => [m.id, m.body]));

    const enriched: ConversationWithProfile[] = rows.map((c) => {
      const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
      return {
        id: c.id,
        last_message_at: c.last_message_at,
        otherId,
        profile: profileMap.get(otherId) ?? null,
        lastMessage: lastMsgMap.get(c.id) ?? null,
      };
    });

    setConversations(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Your Connections
          </h1>
          <p className="text-muted-foreground mb-8">
            Direct conversations with professionals you've reached out to.
          </p>

          {loading ? (
            <LoadingSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyState navigate={navigate} />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Link
                      to={`/chat/${conv.id}`}
                      className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                        {conv.profile?.avatar_url ? (
                          <img
                            src={conv.profile.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-display font-bold text-muted-foreground">
                            {(conv.profile?.display_name || "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-foreground truncate">
                          {conv.profile?.display_name || "Professional"}
                        </p>
                        {(conv.profile?.role || conv.profile?.company) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[conv.profile?.role, conv.profile?.company]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage ?? "Start the conversation"}
                        </p>
                      </div>

                      <MessageCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const EmptyState = ({
  navigate,
}: {
  navigate: ReturnType<typeof useNavigate>;
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <MessageCircle className="w-10 h-10 text-muted-foreground" />
    <p className="mt-4 font-display font-semibold text-foreground">No conversations yet</p>
    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
      Message a verified professional from Discover to start a conversation.
    </p>
    <Button className="mt-6 gap-1.5" onClick={() => navigate("/discover")}>
      <Compass className="w-4 h-4" />
      Go to Discover
    </Button>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 animate-pulse"
      >
        <div className="w-12 h-12 rounded-full bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-secondary rounded" />
          <div className="h-3 w-20 bg-secondary rounded" />
        </div>
      </div>
    ))}
  </div>
);

export default Conversations;
