// ============================================================================
// FlyBye — flight number → airport + departure lookup
// ============================================================================
// Takes a flight number like "AA123" and returns origin/destination IATA +
// scheduled departure/arrival, so the Flutter flight-entry screen can
// pre-fill instead of making the user type them.
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
  arrival_iata?: string;
  arrival_time?: string; // ISO8601 in UTC
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
      departure?: Leg;
      arrival?: Leg;
    }>;
  };
  const f = payload.data?.[0];
  const iata = f?.departure?.iata;
  const scheduled = f?.departure?.scheduled;
  const arrivalScheduled = f?.arrival?.scheduled;

  if (!iata || !scheduled) {
    return json({ ok: false, error: "flight not found today" }, 404);
  }

  const result: Result = {
    ok: true,
    flight_number: fn,
    airport_iata: iata.toUpperCase(),
    airport_name: f?.departure?.airport,
    departure_time: toUtc(scheduled, f?.departure?.timezone),
    arrival_iata: f?.arrival?.iata?.toUpperCase(),
    arrival_time: arrivalScheduled
      ? toUtc(arrivalScheduled, f?.arrival?.timezone)
      : undefined,
  };
  return json(result, 200);
});

type Leg = {
  iata?: string;
  airport?: string;
  scheduled?: string;
  timezone?: string;
};

// AviationStack reports scheduled times as the airport's local wall-clock time
// but labels them "+00:00". Re-interpret the wall time in the airport's IANA
// timezone to get the real UTC instant.
function toUtc(scheduled: string, timezone?: string): string {
  const wall = new Date(scheduled.replace(/([+-]\d\d:\d\d|Z)$/, "") + "Z");
  if (!timezone) return wall.toISOString();
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(wall).map((p) => [p.type, p.value]),
    );
    const asLocal = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    const offsetMs = asLocal - wall.getTime();
    return new Date(wall.getTime() - offsetMs).toISOString();
  } catch {
    return wall.toISOString();
  }
}

function json(body: Result | { ok: false; error: string }, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
