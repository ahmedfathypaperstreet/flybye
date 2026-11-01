import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Refresh cached POIs after 30 days (airport shops change slowly).
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Poi {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const CATEGORIES = ["food", "lounge", "restroom", "shop", "info"] as const;
type Category = (typeof CATEGORIES)[number];

function classify(tags: Record<string, string>): Category | null {
  if (tags.amenity === "toilets") return "restroom";
  if (tags.amenity === "lounge" || tags.tourism === "hotel" || tags.lounge === "yes") return "lounge";
  if (
    tags.amenity === "restaurant" ||
    tags.amenity === "fast_food" ||
    tags.amenity === "cafe" ||
    tags.amenity === "bar" ||
    tags.amenity === "food_court"
  )
    return "food";
  if (/lounge/i.test(tags.name ?? "")) return "lounge";
  if (tags.shop) return "shop";
  if (tags.information || tags.tourism === "information") return "info";
  return null;
}

// The public Overpass servers are often overloaded (502s, 30s+ responses), so
// ask several mirrors at once and take the first good answer.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 55_000;

async function queryOverpass(
  query: string,
): Promise<{ elements?: OverpassElement[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  try {
    return await Promise.any(
      OVERPASS_MIRRORS.map(async (endpoint) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            // Overpass usage policy asks clients to identify themselves.
            "User-Agent": "FlyBye/1.0 (https://flybye.app)",
          },
          body: "data=" + encodeURIComponent(query),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json.elements)) throw new Error(`${endpoint} bad body`);
        return json;
      }),
    );
  } catch (err) {
    console.error("overpass failed on all mirrors", err);
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort(); // cancel the slower mirrors
  }
}

function nameOf(tags: Record<string, string>, category: Category): string {
  return (
    tags.name ||
    tags["name:en"] ||
    tags.brand ||
    tags.operator ||
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

/** Fetches POIs for [airport] from Overpass and upserts them into the cache.
 *  Returns null when every mirror failed. */
async function refreshPois(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  iata: string,
  airport: {
    latitude: number;
    longitude: number;
    bbox_min_lat: number | null;
    bbox_max_lat: number | null;
    bbox_min_lon: number | null;
    bbox_max_lon: number | null;
  },
): Promise<Poi[] | null> {
  // Build bbox (fall back to ±0.02° around centroid)
  const minLat = airport.bbox_min_lat ?? airport.latitude - 0.02;
  const maxLat = airport.bbox_max_lat ?? airport.latitude + 0.02;
  const minLon = airport.bbox_min_lon ?? airport.longitude - 0.02;
  const maxLon = airport.bbox_max_lon ?? airport.longitude + 0.02;

  // `nwr` + `out center` also picks up places mapped as building outlines
  // (ways) rather than single points.
  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
  const query = `
    [out:json][timeout:50];
    (
      nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|toilets|lounge)$"](${bbox});
      nwr["shop"](${bbox});
      nwr["lounge"](${bbox});
      nwr["name"~"[Ll]ounge"](${bbox});
      nwr["tourism"="information"](${bbox});
    );
    out center tags 400;
  `;

  const overpassJson = await queryOverpass(query);
  if (!overpassJson) return null;

  const pois: Poi[] = [];
  for (const el of overpassJson.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    if (!lat || !lon) continue;
    const category = classify(tags);
    if (!category) continue;
    pois.push({
      id: `${el.type}/${el.id}`,
      name: nameOf(tags, category),
      category,
      lat,
      lon,
      tags,
    });
  }

  // Skip empty results so a bad fetch doesn't pin an airport to "no places".
  if (pois.length > 0) {
    await supabase
      .from("airport_pois_cache")
      .upsert(
        { iata, category: "all", data: pois as unknown as Record<string, unknown>[], fetched_at: new Date().toISOString() },
        { onConflict: "iata,category" },
      );
  }
  return pois;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const iata = (url.searchParams.get("iata") || "").toUpperCase().trim();

    if (!/^[A-Z]{3}$/.test(iata)) {
      return new Response(JSON.stringify({ error: "Invalid IATA code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Look up airport coords (unified schema: `iata_code`, no bbox columns)
    const { data: airportRow, error: airportErr } = await supabase
      .from("airports")
      .select("iata_code, latitude, longitude, name, city")
      .eq("iata_code", iata)
      .maybeSingle();

    if (airportErr || !airportRow) {
      return new Response(JSON.stringify({ error: "Airport not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize to the shape clients expect (iata + null bbox → ±0.02° fallback).
    const airport = {
      iata: airportRow.iata_code,
      latitude: airportRow.latitude,
      longitude: airportRow.longitude,
      bbox_min_lat: null as number | null,
      bbox_max_lat: null as number | null,
      bbox_min_lon: null as number | null,
      bbox_max_lon: null as number | null,
      name: airportRow.name,
      city: airportRow.city,
    };

    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // 2. Serve from cache whenever we have it. Overpass routinely takes 30s+,
    // so a stale cache is answered immediately and refreshed in the background.
    const { data: cached } = await supabase
      .from("airport_pois_cache")
      .select("data, fetched_at")
      .eq("iata", iata)
      .eq("category", "all")
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      const stale = age >= CACHE_TTL_MS;
      if (stale) {
        // deno-lint-ignore no-explicit-any
        (globalThis as any).EdgeRuntime?.waitUntil(refreshPois(supabase, iata, airport));
      }
      return json({ airport, pois: cached.data, cached: true, stale });
    }

    // 3. Cold airport: fetch now (slow — pre-warm launch airports with
    // `npm run warm-pois` in flybye-app/scripts).
    const pois = await refreshPois(supabase, iata, airport);
    if (!pois) {
      // Tell the client the list is unavailable (not empty) so it can retry.
      return json({ airport, pois: [], error: "Overpass unavailable" });
    }
    return json({ airport, pois, cached: false });
  } catch (err) {
    console.error("airport-pois error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
