// ============================================================================
// FlyBye — flight number → airport + departure lookup
// ============================================================================
// Takes a flight number like "AA123" and returns origin IATA + scheduled
// departure, so the Flutter flight-entry screen can pre-fill instead of
// making the user type both.
//
// Provider: AviationStack (https://aviationstack.com). Free plan = 100 calls
// per month. Cheap upgrade to $9.99 = 10k/mo. Easy to swap to FlightAware
// AeroAPI later if you outgrow it.
//
// Configure:
//   supabase secrets set AVIATIONSTACK_KEY=<your key>
//   supabase functions deploy flight-lookup
//
// Call from the Flutter client:
//   final res = await Supabase.instance.client.functions.invoke(
//     'flight-lookup', body: {'flight_number': 'AA100'});
// ============================================================================

type Result = {
  ok: true;
  flight_number: string;
  airport_iata: string;
  airport_name?: string;
  departure_time: string; // ISO8601 in UTC
} | {
  ok: false;
  error: string;
};

Deno.serve(async (req) => {
  // Caller must be an authenticated user (any tier). Supabase functions
  // automatically reject unauthenticated requests when verify_jwt is true,
  // which is the default. We still parse the body.
  let body: { flight_number?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }

  const fn = (body.flight_number ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(fn)) {
    return json({ ok: false, error: "invalid flight number" }, 400);
  }

  const apiKey = Deno.env.get("AVIATIONSTACK_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "lookup not configured" }, 503);
  }

  const url = new URL("http://api.aviationstack.com/v1/flights");
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("flight_iata", fn);
  url.searchParams.set("limit", "1");

  let resp: Response;
  try {
    resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (e) {
    return json({ ok: false, error: `provider unreachable: ${e}` }, 502);
  }

  if (!resp.ok) {
    return json({ ok: false, error: `provider ${resp.status}` }, 502);
  }

  const payload = await resp.json() as {
    data?: Array<{
      flight?: { iata?: string };
      departure?: { iata?: string; airport?: string; scheduled?: string };
    }>;
  };
  const f = payload.data?.[0];
  const iata = f?.departure?.iata;
  const scheduled = f?.departure?.scheduled;

  if (!iata || !scheduled) {
    return json({ ok: false, error: "flight not found today" }, 404);
  }

  const result: Result = {
    ok: true,
    flight_number: fn,
    airport_iata: iata.toUpperCase(),
    airport_name: f?.departure?.airport,
    departure_time: new Date(scheduled).toISOString(),
  };
  return json(result, 200);
});

function json(body: Result | { ok: false; error: string }, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
