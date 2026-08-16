// ============================================================================
// FlyBye — RevenueCat → Supabase webhook
// ============================================================================
// Receives subscription events from RevenueCat and updates `subscriptions`.
//
// Configure in RevenueCat:
//   Project → Integrations → Webhooks
//   URL: https://<project-ref>.functions.supabase.co/revenuecat-webhook
//   Authorization header: Bearer ${RC_WEBHOOK_SECRET}
//
// Set the secret in Supabase:
//   supabase secrets set RC_WEBHOOK_SECRET=...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...   (auto-injected on Supabase)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type RcEvent = {
  type:
    | "INITIAL_PURCHASE"
    | "RENEWAL"
    | "CANCELLATION"
    | "EXPIRATION"
    | "BILLING_ISSUE"
    | "SUBSCRIBER_ALIAS"
    | "PRODUCT_CHANGE"
    | "NON_RENEWING_PURCHASE"
    | "UNCANCELLATION"
    | "TRANSFER";
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  period_type?: "NORMAL" | "INTRO" | "TRIAL" | "PROMOTIONAL";
  expiration_at_ms?: number;
  entitlement_ids?: string[];
};

type RcPayload = { event: RcEvent };

// Map RevenueCat entitlement IDs → tier
function tierFromEntitlements(entitlements: string[] | undefined): "standby" | "regular" | "first_class" {
  const set = new Set(entitlements ?? []);
  if (set.has("first_class")) return "first_class";
  if (set.has("regular")) return "regular";
  return "standby";
}

const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

const INACTIVE_EVENTS = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
]);

Deno.serve(async (req) => {
  // 1. Auth — RevenueCat sends a static bearer
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("RC_WEBHOOK_SECRET") ?? ""}`;
  if (!Deno.env.get("RC_WEBHOOK_SECRET") || auth !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  // 2. Parse
  let payload: RcPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const ev = payload.event;
  if (!ev || !ev.app_user_id) {
    return new Response("missing event", { status: 400 });
  }

  // 3. Connect with service role (bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 4. Resolve user_id — we set RC's appUserId to the Supabase user.id from the
  //    Flutter side, so app_user_id is already the uuid.
  const userId = ev.app_user_id;

  // 5. Compute tier + active flag
  const isActive = ACTIVE_EVENTS.has(ev.type);
  const isInactive = INACTIVE_EVENTS.has(ev.type);

  const tier = isActive ? tierFromEntitlements(ev.entitlement_ids) : "standby";
  const expiresAt = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;

  // 6. Upsert
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      tier,
      rc_app_user_id: ev.app_user_id,
      product_id: ev.product_id ?? null,
      period_type: ev.period_type ?? null,
      expires_at: expiresAt,
      is_active: isActive && !isInactive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("upsert failed", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
