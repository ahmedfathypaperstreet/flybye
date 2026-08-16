import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, Radio, CloudOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface LocationShare {
  user_id: string;
  airport: string;
  terminal: string | null;
  zone: string | null;
  note: string | null;
  is_active: boolean;
  last_seen_at: string;
}

interface Props {
  /** Other user's id in the conversation — used to show their share */
  otherUserId: string;
  /** Default airport code to associate with the share (e.g. match.airport). */
  defaultAirport: string | null;
}

const HEARTBEAT_MS = 60_000;

const LocationShareCard = ({ otherUserId, defaultAirport }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const online = useOnlineStatus();

  const [myShare, setMyShare] = useState<LocationShare | null>(null);
  const [theirShare, setTheirShare] = useState<LocationShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [terminal, setTerminal] = useState("");
  const [zone, setZone] = useState("");
  const [note, setNote] = useState("");

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchShares = async () => {
      const [{ data: mine }, { data: theirs }] = await Promise.all([
        supabase
          .from("location_shares")
          .select("user_id, airport, terminal, zone, note, is_active, last_seen_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("location_shares")
          .select("user_id, airport, terminal, zone, note, is_active, last_seen_at")
          .eq("user_id", otherUserId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setMyShare(mine as LocationShare | null);
      setTheirShare(theirs as LocationShare | null);
      if (mine) {
        setTerminal(mine.terminal ?? "");
        setZone(mine.zone ?? "");
        setNote(mine.note ?? "");
      }
      setLoading(false);
    };

    fetchShares();
    return () => {
      cancelled = true;
    };
  }, [user, otherUserId]);

  // Poll partner's share every 15s
  useEffect(() => {
    if (!otherUserId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("location_shares")
        .select("user_id, airport, terminal, zone, note, is_active, last_seen_at")
        .eq("user_id", otherUserId)
        .eq("is_active", true)
        .maybeSingle();
      setTheirShare(data as LocationShare | null);
    }, 15_000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  // Heartbeat: while sharing is on, refresh last_seen_at periodically and stop on unmount/visibility change
  useEffect(() => {
    if (!user || !myShare?.is_active) return;

    const beat = async () => {
      await supabase
        .from("location_shares")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    const interval = setInterval(beat, HEARTBEAT_MS);

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        // Best-effort: turn off when app is backgrounded
        supabase
          .from("location_shares")
          .update({ is_active: false })
          .eq("user_id", user.id);
      }
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [user, myShare?.is_active]);

  const persist = async (patch: Partial<LocationShare> & { is_active: boolean }) => {
    if (!user) return;
    const airport = defaultAirport ?? myShare?.airport ?? "Unknown";
    setSaving(true);
    const payload = {
      user_id: user.id,
      airport,
      terminal: terminal.trim() || null,
      zone: zone.trim() || null,
      note: note.trim() || null,
      last_seen_at: new Date().toISOString(),
      ...patch,
    };
    const { data, error } = await supabase
      .from("location_shares")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't update location", description: error.message, variant: "destructive" });
      return;
    }
    setMyShare(data as LocationShare);
  };

  const toggleActive = (next: boolean) => {
    if (!online) {
      toast({
        title: "You're offline",
        description: "Live location sharing needs an internet connection.",
        variant: "destructive",
      });
      return;
    }
    if (next && !defaultAirport && !myShare?.airport) {
      toast({
        title: "Add an airport first",
        description: "Set your current airport in your flights or profile.",
      });
      return;
    }
    persist({ is_active: next });
  };

  const saveDetails = () => persist({ is_active: myShare?.is_active ?? true });

  if (loading) {
    return (
      <div className="glass-card p-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isOn = !!myShare?.is_active;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* My share toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Radio className={`w-4 h-4 ${isOn ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground">
              Share my terminal
            </p>
            <p className="text-xs text-muted-foreground">
              Only this match can see it. Stops when you leave the app.
            </p>
          </div>
        </div>
        <Switch
          checked={isOn}
          onCheckedChange={toggleActive}
          disabled={saving || !online}
          aria-label="Share my terminal"
        />
      </div>

      {!online && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <CloudOff className="w-3 h-3" />
          You're offline — live sharing is paused until you reconnect.
        </p>
      )}

      <AnimatePresence initial={false}>
        {isOn && (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input
                value={terminal}
                onChange={(e) => setTerminal(e.target.value.slice(0, 24))}
                placeholder="Terminal (e.g. B)"
                className="text-sm"
              />
              <Input
                value={zone}
                onChange={(e) => setZone(e.target.value.slice(0, 40))}
                placeholder="Zone (e.g. Gate 12)"
                className="text-sm"
              />
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 80))}
              placeholder="Optional note (e.g. by the bookstore)"
              className="text-sm mt-2"
            />
            <button
              onClick={saveDetails}
              disabled={saving || !online}
              title={!online ? "You're offline" : undefined}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-primary/10 text-primary font-display font-semibold text-xs hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!online ? "Offline" : saving ? "Saving…" : "Update spot"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partner share */}
      <div className="border-t border-border/40 pt-3">
        {theirShare ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-display font-semibold text-foreground">
                They're at {theirShare.airport}
                {theirShare.terminal ? ` · Terminal ${theirShare.terminal}` : ""}
                {theirShare.zone ? ` · ${theirShare.zone}` : ""}
              </p>
              {theirShare.note && (
                <p className="text-xs text-muted-foreground mt-0.5">"{theirShare.note}"</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Updated {new Date(theirShare.last_seen_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            They aren't sharing their spot right now.
          </p>
        )}
      </div>
    </div>
  );
};

export default LocationShareCard;
