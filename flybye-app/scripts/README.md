# Operator scripts

## Setup

```bash
cd scripts
npm install
```

Then export two env vars (the service-role key is in Supabase → Project Settings → API → `service_role` `secret`):

```bash
export SUPABASE_URL='https://pngjuliouszzhylkimsd.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='eyJ...'   # KEEP THIS SECRET
```

## Scripts

| Command | What it does |
|---|---|
| `npm run seed` | Creates the App Review account + 3 verified demo professionals at each of 12 launch airports (JFK, LGA, EWR, LAX, SFO, ORD, ATL, MIA, BOS, DFW, LHR, DXB). Idempotent — re-running refreshes their presence; they stay visible for 14 days, so re-run at least every two weeks. |
| `npm run seed -- --remove` | Deletes every `demo-*@flybye.app` user (do this before public launch). |
| `npm run warm-pois` | Pre-loads the lounges/shops/food cache for the launch airports (Overpass takes 30s+ per airport, so do this before testers arrive). Pass IATA codes to warm specific airports: `npm run warm-pois -- JFK SFO`. |

The reviewer login created by `seed`: `reviewer@flybye.app` / `ReviewMe2026!`.

## admin.sh

Bash CLI for the verification queue and reports. See `./admin.sh help`.
Set `DATABASE_URL` (Supabase → Project Settings → Database → URI) before using.
