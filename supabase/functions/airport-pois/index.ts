import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cache POIs for 7 days
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  if (tags.shop) return "shop";
  if (tags.information || tags.tourism === "information") return "info";
  return null;
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

    // 2. Try cache first
    const { data: cached } = await supabase
      .from("airport_pois_cache")
      .select("data, fetched_at")
      .eq("iata", iata)
      .eq("category", "all")
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({ airport, pois: cached.data, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3. Build bbox (fall back to ±0.02° around centroid)
    const minLat = airport.bbox_min_lat ?? airport.latitude - 0.02;
    const maxLat = airport.bbox_max_lat ?? airport.latitude + 0.02;
    const minLon = airport.bbox_min_lon ?? airport.longitude - 0.02;
    const maxLon = airport.bbox_max_lon ?? airport.longitude + 0.02;

    // 4. Overpass query
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|fast_food|bar|food_court|toilets|lounge"](${minLat},${minLon},${maxLat},${maxLon});
        node["shop"](${minLat},${minLon},${maxLat},${maxLon});
        node["tourism"="information"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out center 200;
    `;

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });

    if (!overpassRes.ok) {
      // Fall back to stale cache rather than failing
      if (cached) {
        return new Response(
          JSON.stringify({ airport, pois: cached.data, cached: true, stale: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ airport, pois: [], error: "Overpass unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const overpassJson = await overpassRes.json();
    const elements: OverpassElement[] = overpassJson.elements ?? [];

    const pois: Poi[] = [];
    for (const el of elements) {
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

    // 5. Upsert into cache
    await supabase
      .from("airport_pois_cache")
      .upsert(
        { iata, category: "all", data: pois as unknown as Record<string, unknown>[], fetched_at: new Date().toISOString() },
        { onConflict: "iata,category" },
      );

    return new Response(
      JSON.stringify({ airport, pois, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("airport-pois error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
