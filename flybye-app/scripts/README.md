# Operator scripts

## Setup

```bash
cd scripts
npm install
```

Then export two env vars (the service-role key is in Supabase → Project Settings → API → `service_role` `secret`):

```bash
export SUPABASE_URL='https://rxipszdcbvrevuyqpncq.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='eyJ...'   # KEEP THIS SECRET
```

## Scripts

| Command | What it does |
|---|---|
| `npm run seed` | Creates 6 demo users (1 reviewer + 5 demo profiles) at JFK/LAX with photos, active flights, and approved verifications. Idempotent — re-running skips existing users. |

The reviewer login created by `seed`: `reviewer@flybye.app` / `ReviewMe2026!`.

## admin.sh

Bash CLI for the verification queue and reports. See `./admin.sh help`.
Set `DATABASE_URL` (Supabase → Project Settings → Database → URI) before using.
