import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Maximize2, X, Loader2, Utensils, Sofa, ShoppingBag, Info, Bath } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { cachePois, getCachedPois } from "@/lib/offlineCache";

interface Poi {
  id: string;
  name: string;
  category: "food" | "lounge" | "restroom" | "shop" | "info";
  lat: number;
  lon: number;
}

interface AirportInfo {
  iata: string;
  latitude: number;
  longitude: number;
  bbox_min_lat: number | null;
  bbox_max_lat: number | null;
  bbox_min_lon: number | null;
  bbox_max_lon: number | null;
  name: string;
  city: string;
}

interface Props {
  iata: string | null;
  className?: string;
}

const CATEGORY_META: Record<Poi["category"], { color: string; Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  food: { color: "hsl(var(--primary))", Icon: Utensils, label: "Food & drinks" },
  lounge: { color: "hsl(var(--accent))", Icon: Sofa, label: "Lounges" },
  shop: { color: "hsl(35 90% 55%)", Icon: ShoppingBag, label: "Shops" },
  restroom: { color: "hsl(200 70% 55%)", Icon: Bath, label: "Restrooms" },
  info: { color: "hsl(280 60% 60%)", Icon: Info, label: "Info" },
};

// Free OSM raster style (no API key)
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
  ],
};

const TerminalMap = ({ iata, className }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [airport, setAirport] = useState<AirportInfo | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<Poi["category"]>>(
    new Set(["food", "lounge", "shop", "restroom", "info"]),
  );

  // Fetch POIs whenever the airport changes — cached-first, network refresh
  useEffect(() => {
    if (!iata) return;
    setLoading(true);
    let cancelled = false;

    const hydrateAndFetch = async () => {
      // 1. Cached payload (instant, even offline)
      const cached = await getCachedPois<{ airport: AirportInfo; pois: Poi[] }>(iata);
      if (!cancelled && cached) {
        if (cached.airport) setAirport(cached.airport);
        setPois(cached.pois ?? []);
        setLoading(false);
      }

      // 2. Skip network when offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cached) setLoading(false);
        return;
      }

      // 3. Refresh from edge function and update cache
      try {
        const { data, error } = await supabase.functions.invoke<{
          airport: AirportInfo;
          pois: Poi[];
        }>(`airport-pois?iata=${encodeURIComponent(iata)}`);
        if (error) throw error;
        if (cancelled) return;
        if (data?.airport) setAirport(data.airport);
        setPois(data?.pois ?? []);
        if (data) cachePois(iata, data);
      } catch (err) {
        console.error("Failed to load POIs", err);
        if (!cached) setPois([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    hydrateAndFetch();
    return () => {
      cancelled = true;
    };
  }, [iata]);

  // Initialize / update map
  useEffect(() => {
    if (!containerRef.current || !airport) return;

    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: [airport.longitude, airport.latitude],
        zoom: 14,
        attributionControl: { compact: true },
      });
      mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    } else {
      mapRef.current.flyTo({
        center: [airport.longitude, airport.latitude],
        zoom: 14,
      });
    }

    // Fit to bbox if we have one
    if (
      airport.bbox_min_lat != null &&
      airport.bbox_max_lat != null &&
      airport.bbox_min_lon != null &&
      airport.bbox_max_lon != null
    ) {
      mapRef.current.fitBounds(
        [
          [airport.bbox_min_lon, airport.bbox_min_lat],
          [airport.bbox_max_lon, airport.bbox_max_lat],
        ],
        { padding: 40, duration: 800 },
      );
    }
  }, [airport]);

  // Update markers when POIs or filters change
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pois
      .filter((p) => activeFilters.has(p.category))
      .forEach((poi) => {
        const meta = CATEGORY_META[poi.category];
        const el = document.createElement("div");
        el.className = "rounded-full border-2 border-background shadow-lg flex items-center justify-center";
        el.style.width = "26px";
        el.style.height = "26px";
        el.style.background = meta.color;
        el.style.cursor = "pointer";
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>`;

        const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
          `<div style="font-family: 'DM Sans', system-ui, sans-serif; font-size: 13px;">
            <div style="font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 2px;">${poi.name.replace(/</g, "&lt;")}</div>
            <div style="font-size: 11px; color: hsl(var(--muted-foreground)); text-transform: capitalize;">${meta.label}</div>
          </div>`,
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([poi.lon, poi.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);
        markersRef.current.push(marker);
      });
  }, [pois, activeFilters]);

  // Keep MapLibre canvas sized after expand/collapse
  useEffect(() => {
    if (!mapRef.current) return;
    const id = window.setTimeout(() => mapRef.current?.resize(), 320);
    return () => window.clearTimeout(id);
  }, [expanded]);

  // Cleanup
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const toggleFilter = (cat: Poi["category"]) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (!iata) {
    return (
      <div className={cn("glass-card p-6 text-center text-sm text-muted-foreground", className)}>
        Add a flight or set a home airport to load the terminal map.
      </div>
    );
  }

  const counts = pois.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border/60 bg-secondary",
        expanded
          ? "fixed inset-0 z-[100] rounded-none"
          : cn("rounded-2xl h-[260px]", className),
      )}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Top-left: airport label */}
      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-background/85 backdrop-blur border border-border/60 shadow-sm">
        <p className="text-xs font-display font-bold text-foreground">
          {airport?.iata ?? iata}
          {airport?.city ? <span className="text-muted-foreground font-normal"> · {airport.city}</span> : null}
        </p>
      </div>

      {/* Top-right: expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Collapse map" : "Expand map"}
        className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-background/85 backdrop-blur border border-border/60 shadow-sm flex items-center justify-center hover:bg-background transition-colors"
      >
        {expanded ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm pointer-events-none">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Bottom: filter pills */}
      <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(CATEGORY_META) as Poi["category"][]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const isOn = activeFilters.has(cat);
          const count = counts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-all",
                isOn
                  ? "bg-background border-border shadow-sm text-foreground"
                  : "bg-background/60 border-border/40 text-muted-foreground opacity-60",
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: meta.color }}
              />
              <meta.Icon className="w-3 h-3" />
              <span>{meta.label}</span>
              {count > 0 && <span className="opacity-70">·{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TerminalMap;
