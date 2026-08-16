/**
 * Reads the current user's ID verification status directly from their profile.
 *
 * Status values mirror `profiles.verification_status`:
 *   - "none"     : never submitted
 *   - "pending"  : ID uploaded, awaiting manual review
 *   - "approved" : reviewed & verified (also sets profiles.verified = true)
 *   - "rejected" : review failed — user may re-submit
 *
 * `verified` mirrors `profiles.verified` and is what gates messaging.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "./useOnlineStatus";

export type VerificationState = "none" | "pending" | "approved" | "rejected";

export interface VerificationStatus {
  /** Resolved status from `profiles.verification_status`. */
  state: VerificationState;
  /** Mirrors `profiles.verified` — the gate for messaging. */
  verified: boolean;
  /** True while the first fetch is in-flight. */
  loading: boolean;
  /** Force a refetch (also used by the "Check now" button). */
  refresh: () => void;
}

const POLL_INTERVAL_MS = 8_000; // while a review is pending
const IDLE_INTERVAL_MS = 60_000; // terminal states

export function useVerificationStatus(): VerificationStatus {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [state, setState] = useState<VerificationState>("none");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const tickRef = useRef(0);

  const fetchOnce = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("verification_status, verified")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      // Network or RLS hiccup — keep last known state.
      setLoading(false);
      return;
    }

    setState((data?.verification_status ?? "none") as VerificationState);
    setVerified(data?.verified ?? false);
    setLoading(false);
  };

  // Initial + reactive fetch (auth/online changes).
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, online]);

  // Polling loop — faster while a review is pending, slower otherwise.
  useEffect(() => {
    if (!user) return;
    const interval = state === "pending" ? POLL_INTERVAL_MS : IDLE_INTERVAL_MS;
    const id = window.setInterval(() => {
      tickRef.current += 1;
      fetchOnce();
    }, interval);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state]);

  return {
    state,
    verified,
    loading,
    refresh: fetchOnce,
  };
}
