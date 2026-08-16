import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Lock } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import LocationShareCard from "@/components/LocationShareCard";
import { cacheMessages, getCachedMessages } from "@/lib/offlineCache";
import { queueMutation } from "@/lib/syncQueue";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface ConversationInfo {
  id: string;
  otherId: string;
  otherProfile: {
    display_name: string | null;
    avatar_url: string | null;
    current_airport: string | null;
  } | null;
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { verified } = useVerificationStatus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Fetch conversation + other participant's profile, then mark read.
  useEffect(() => {
    if (!user || !conversationId) return;
    const fetchConversation = async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, user_a_id, user_b_id")
        .eq("id", conversationId)
        .maybeSingle();

      if (!conv) {
        toast({ title: "Conversation not found", variant: "destructive" });
        navigate("/matches");
        return;
      }

      const otherId = conv.user_a_id === user.id ? conv.user_b_id : conv.user_a_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, current_airport")
        .eq("id", otherId)
        .maybeSingle();

      setConversation({ id: conv.id, otherId, otherProfile: profile });

      // Mark the counterpart's messages as read.
      supabase.rpc("mark_conversation_read", { conv: conversationId });
    };
    fetchConversation();
  }, [user, conversationId, navigate, toast]);

  // Fetch messages: hydrate from cache first, then refresh from network.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    const fetchMessages = async () => {
      // 1. Hydrate from IndexedDB immediately
      const cached = await getCachedMessages<Message>(conversationId);
      if (!cancelled && cached.length) {
        setMessages(cached.sort((a, b) => a.created_at.localeCompare(b.created_at)));
        setLoading(false);
      }

      // 2. Skip network when offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setLoading(false);
        return;
      }

      // 3. Refresh from network and cache
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!cancelled && data) {
        setMessages(data as Message[]);
        cacheMessages(conversationId, data as Message[]);
      }
      setLoading(false);
    };
    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Realtime subscription: append new inserts for this conversation.
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            // De-dupe: drop any optimistic placeholder from this sender and
            // skip if we already have this id.
            if (prev.some((m) => m.id === incoming.id)) return prev;
            const withoutPending = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("pending-") &&
                  m.sender_id === incoming.sender_id &&
                  m.body === incoming.body
                ),
            );
            const next = [...withoutPending, incoming].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
            cacheMessages(conversationId, next);
            return next;
          });
          // Mark counterpart's incoming message read while the chat is open.
          if (user && incoming.sender_id !== user.id) {
            supabase.rpc("mark_conversation_read", { conv: conversationId });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId || sending) return;

    setSending(true);
    const body = newMessage.trim();
    const payload = { conversation_id: conversationId, sender_id: user.id, body };

    // Optimistically add message locally
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      await queueMutation({ kind: "message", payload });
      setSending(false);
      return;
    }

    const { error } = await supabase.from("messages").insert(payload);
    if (error) {
      // Network died → queue
      await queueMutation({ kind: "message", payload });
      toast({ title: "Saved — will send when online" });
    }
    setSending(false);
  };

  if (authLoading || !user) return null;

  const otherName = conversation?.otherProfile?.display_name || "Professional";
  const otherAvatar = conversation?.otherProfile?.avatar_url;
  const otherAirport = conversation?.otherProfile?.current_airport ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Chat header */}
      <div className="fixed top-[57px] left-0 right-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/matches")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            {otherAvatar ? (
              <img src={otherAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-display font-bold text-muted-foreground">
                {otherName[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground truncate text-sm">{otherName}</p>
            {otherAirport && (
              <p className="text-xs text-muted-foreground">{otherAirport}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-[130px] pb-24 px-4"
      >
        <div className="container mx-auto max-w-2xl space-y-3">
          {conversation && (
            <LocationShareCard
              otherUserId={conversation.otherId}
              defaultAirport={otherAirport}
            />
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                No messages yet. Say hello to {otherName}! 👋
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    <p>{msg.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Message input — gated on verification */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        {verified ? (
          <form
            onSubmit={handleSend}
            className="container mx-auto max-w-2xl px-4 py-3 flex items-center gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message…"
              className="flex-1"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              Verify your ID to message.
            </p>
            <Button size="sm" onClick={() => navigate("/profile")}>
              Verify
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
