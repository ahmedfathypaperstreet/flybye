/**
 * FlyBye — pre-load the places (lounges / shops / food) cache.
 *
 * The `airport-pois` edge function pulls places from OpenStreetMap's Overpass
 * API, which routinely takes 30s+ per airport. Run this before testers arrive
 * so every launch airport is answered instantly from `airport_pois_cache`.
 *
 *   export SUPABASE_URL='https://pngjuliouszzhylkimsd.supabase.co'
 *   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
 *   npm run warm-pois                 # default launch airports
 *   npm run warm-pois -- JFK SFO      # specific airports
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const DEFAULT_AIRPORTS = [
  "JFK", "LGA", "EWR", "LAX", "SFO", "ORD",
  "ATL", "MIA", "BOS", "DFW", "LHR", "DXB",
];

// Overpass is a shared free service that rate-limits per IP (and every call
// already hits three mirrors), so warm one airport at a time and back off
// between retries.
const CONCURRENCY = 1;
const ATTEMPTS = 5;
const RETRY_DELAY_MS = 20_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function warm(iata: string): Promise<string> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/airport-pois?iata=${iata}`, {
        headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
        signal: AbortSignal.timeout(120_000),
      });
      const body = await res.json();
      if (res.ok && !body.error) {
        const source = body.cached ? "already cached" : "fetched";
        return `✓ ${iata}: ${body.pois.length} places (${source})`;
      }
      console.log(`  ${iata} attempt ${attempt}: ${body.error ?? res.status}`);
    } catch (e) {
      console.log(`  ${iata} attempt ${attempt}: ${(e as Error).message}`);
    }
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  return `✗ ${iata}: failed after ${ATTEMPTS} attempts — re-run later`;
}

async function main() {
  const args = process.argv.slice(2).map((a) => a.toUpperCase());
  const queue = args.length ? args : [...DEFAULT_AIRPORTS];
  const results: string[] = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let iata = queue.shift(); iata; iata = queue.shift()) {
        const line = await warm(iata);
        console.log(line);
        results.push(line);
      }
    }),
  );
  if (results.some((r) => r.startsWith("✗"))) process.exit(1);
}

main();
