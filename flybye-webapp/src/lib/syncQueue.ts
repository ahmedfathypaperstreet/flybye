import { supabase } from "@/integrations/supabase/client";
import {
  bumpMutationAttempts,
  deleteMutation,
  enqueueMutation,
  getQueuedMutations,
  type QueuedMutation,
} from "./offlineCache";

const MAX_ATTEMPTS = 5;

let flushing = false;

// ─────────────────────────────────────────────────────────────────────────────
// Drop-event emitter
// When a queued item exhausts its retry budget, we surface a destructive toast.
// ConnectionBanner subscribes to these events.
// ─────────────────────────────────────────────────────────────────────────────

export interface DroppedMutationEvent {
  kind: QueuedMutation["kind"];
  /** Friendly label for toasts, e.g. "Verify your ID". Falls back to kind. */
  label?: string;
}

type DropListener = (e: DroppedMutationEvent) => void;
const dropListeners = new Set<DropListener>();

export function onMutationDropped(fn: DropListener): () => void {
  dropListeners.add(fn);
  return () => dropListeners.delete(fn);
}

function emitDropped(e: DroppedMutationEvent) {
  dropListeners.forEach((l) => {
    try {
      l(e);
    } catch {
      /* listener error — ignore */
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Queue a write to be applied when the app is online. */
export async function queueMutation(m: Omit<QueuedMutation, "id" | "createdAt" | "attempts">) {
  await enqueueMutation(m);
}

/**
 * Convenience: queue an external API call routed through a Supabase Edge Function.
 *
 * Use this for any third-party integration that can be safely retried, e.g.
 * AeroDataBox flight enrichment (`edgeFunction: "enrich-flight"`).
 */
export async function queueEdgeCall(opts: {
  /** Name of the edge function, e.g. "enrich-flight". */
  edgeFunction: string;
  /** JSON body to POST. */
  body?: Record<string, unknown>;
  /** Friendly label used in toast messages, e.g. "Flight enrichment". */
  label: string;
}) {
  await enqueueMutation({
    kind: "edge-function",
    payload: {
      edgeFunction: opts.edgeFunction,
      body: opts.body ?? {},
      label: opts.label,
    },
  });
}

/** Apply a single queued mutation against Supabase. Returns true on success. */
async function applyMutation(m: QueuedMutation): Promise<boolean> {
  try {
    switch (m.kind) {
      case "message": {
        const p = m.payload as {
          conversation_id: string;
          sender_id: string;
          body: string;
        };
        const { error } = await supabase.from("messages").insert(p);
        return !error;
      }
      case "flight-upsert": {
        const p = m.payload as { id?: string; user_id: string; [k: string]: unknown };
        const { error } = await supabase.from("flights").upsert(p as never);
        return !error;
      }
      case "flight-delete": {
        const p = m.payload as { id: string };
        const { error } = await supabase.from("flights").delete().eq("id", p.id);
        return !error;
      }
      case "location-share": {
        const p = m.payload as { user_id: string; [k: string]: unknown };
        const { error } = await supabase
          .from("location_shares")
          .upsert(p as never, { onConflict: "user_id" });
        return !error;
      }
      case "edge-function": {
        const p = m.payload as {
          edgeFunction: string;
          body: Record<string, unknown>;
          label?: string;
        };
        const { error } = await supabase.functions.invoke(p.edgeFunction, {
          body: p.body,
        });
        return !error;
      }
      default:
        return true; // unknown — drop it
    }
  } catch {
    return false;
  }
}

/** Friendly label for a dropped item — used in destructive toasts. */
function labelFor(m: QueuedMutation): string {
  if (m.kind === "edge-function") {
    const p = m.payload as { label?: string };
    return p.label ?? "Background request";
  }
  switch (m.kind) {
    case "message":
      return "Message";
    case "flight-upsert":
      return "Flight update";
    case "flight-delete":
      return "Flight deletion";
    case "location-share":
      return "Location share";
    default:
      return "Pending change";
  }
}

/** Drain the queue. Safe to call repeatedly; only one flush runs at a time. */
export async function flushMutationQueue(): Promise<{ applied: number; failed: number; dropped: number }> {
  if (flushing) return { applied: 0, failed: 0, dropped: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { applied: 0, failed: 0, dropped: 0 };
  }
  flushing = true;
  let applied = 0;
  let failed = 0;
  let dropped = 0;
  try {
    const queue = await getQueuedMutations();
    for (const m of queue) {
      if (m.attempts >= MAX_ATTEMPTS) {
        await deleteMutation(m.id!);
        emitDropped({ kind: m.kind, label: labelFor(m) });
        dropped += 1;
        continue;
      }
      const ok = await applyMutation(m);
      if (ok) {
        await deleteMutation(m.id!);
        applied += 1;
      } else {
        await bumpMutationAttempts(m.id!);
        // If this attempt put it AT the cap, drop now and notify.
        if (m.attempts + 1 >= MAX_ATTEMPTS) {
          await deleteMutation(m.id!);
          emitDropped({ kind: m.kind, label: labelFor(m) });
          dropped += 1;
        } else {
          failed += 1;
        }
      }
    }
  } finally {
    flushing = false;
  }
  return { applied, failed, dropped };
}
