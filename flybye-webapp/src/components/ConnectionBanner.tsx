import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, RefreshCw, CheckCircle2, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { flushMutationQueue, onMutationDropped } from "@/lib/syncQueue";
import { getQueuedMutations } from "@/lib/offlineCache";
import { useToast } from "@/hooks/use-toast";

/**
 * Persistent connection status pill — always visible in the corner.
 * Expands into a wider banner when offline / syncing / just-synced.
 */
const ConnectionBanner = () => {
  const online = useOnlineStatus();
  const { toast } = useToast();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Surface a destructive toast whenever the queue gives up on a mutation.
  useEffect(() => {
    return onMutationDropped(({ label }) => {
      toast({
        title: `${label ?? "Pending change"} couldn't sync`,
        description: "We tried 5 times and gave up. Please try again.",
        variant: "destructive",
      });
    });
  }, [toast]);

  // Track queued writes
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const q = await getQueuedMutations();
      if (!cancelled) setPending(q.length);
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [online, syncing]);

  // Flush when reconnecting
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      const result = await flushMutationQueue();
      if (cancelled) return;
      setSyncing(false);
      if (result.applied > 0) {
        setJustSynced(true);
        window.setTimeout(() => setJustSynced(false), 2500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online]);

  // Mode determines visual state
  const mode: "offline" | "syncing" | "synced" | "online" = !online
    ? "offline"
    : syncing
      ? "syncing"
      : justSynced
        ? "synced"
        : "online";

  // Expanded banner shows for everything except the steady "online" state
  const expanded = mode !== "online";

  const palette: Record<typeof mode, string> = {
    offline: "bg-destructive/90 text-destructive-foreground",
    syncing: "bg-foreground/85 text-background",
    synced: "bg-primary/90 text-primary-foreground",
    online: "bg-card/85 text-foreground border border-border",
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[200] pointer-events-none flex justify-center pt-1.5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`pointer-events-auto inline-flex items-center gap-2 rounded-full text-[11px] font-display font-semibold shadow-lg backdrop-blur ${palette[mode]} ${
            expanded ? "px-3 py-1.5" : "px-2.5 py-1"
          }`}
          role="status"
          aria-live="polite"
          aria-label={
            mode === "offline"
              ? `Offline${pending > 0 ? `, ${pending} change${pending === 1 ? "" : "s"} queued` : ""}`
              : mode === "syncing"
                ? `Syncing ${pending} pending change${pending === 1 ? "" : "s"}`
                : mode === "synced"
                  ? "Synced"
                  : "Online"
          }
        >
          {mode === "offline" && (
            <>
              <CloudOff className="w-3.5 h-3.5" />
              Offline ·{" "}
              {pending > 0
                ? `${pending} change${pending === 1 ? "" : "s"} queued`
                : "showing cached data"}
            </>
          )}
          {mode === "syncing" && (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Syncing {pending} change{pending === 1 ? "" : "s"}…
            </>
          )}
          {mode === "synced" && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced
            </>
          )}
          {mode === "online" && (
            <>
              <Wifi className="w-3 h-3 text-primary" />
              <span className="sr-only">Online</span>
              <span aria-hidden="true" className="tracking-wide">Online</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ConnectionBanner;
