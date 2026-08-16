/**
 * FlyBye — seed demo users for App Review + early testing.
 *
 * Creates 6 verified profiles (3 at JFK, 3 at LAX) with photos, an active
 * flight, and an approved verification record.
 *
 *   npm i -D ts-node @types/node
 *   npm i  @supabase/supabase-js dotenv
 *
 * Run with:
 *   export SUPABASE_URL='https://rxipszdcbvrevuyqpncq.supabase.co'
 *   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'   # from dashboard → API
 *   npx ts-node scripts/seed_demo_users.ts
 *
 * Idempotent: re-running skips users that already exist.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Demo = {
  email: string;
  password: string;
  displayName: string;
  birthdate: string; // YYYY-MM-DD
  bio: string;
  vibes: string[];
  airport: "JFK" | "LAX";
  /** Hours from now until departure */
  departsInH: number;
  /** A randomuser.me–style photo URL for the avatar */
  photoUrl: string;
};

// ── reviewer test account + 5 demo profiles ────────────────────────────────
const DEMOS: Demo[] = [
  {
    email: "reviewer@flybye.app",
    password: "ReviewMe2026!",
    displayName: "Alex (Reviewer)",
    birthdate: "1995-04-12",
    bio: "Apple test account.",
    vibes: ["Solo travel", "Just landed"],
    airport: "JFK",
    departsInH: 6,
    photoUrl: "https://i.pravatar.cc/600?img=12",
  },
  {
    email: "demo-jamie@flybye.app",
    password: "Demo2026!",
    displayName: "Jamie",
    birthdate: "1998-07-09",
    bio: "On a layover. Books and bad airport coffee.",
    vibes: ["Reading", "Foodie", "Layover"],
    airport: "JFK",
    departsInH: 4,
    photoUrl: "https://i.pravatar.cc/600?img=32",
  },
  {
    email: "demo-priya@flybye.app",
    password: "Demo2026!",
    displayName: "Priya",
    birthdate: "1994-02-19",
    bio: "Heading to a wedding. Up for hangar talk.",
    vibes: ["Foodie", "Music"],
    airport: "JFK",
    departsInH: 2,
    photoUrl: "https://i.pravatar.cc/600?img=47",
  },
  {
    email: "demo-marco@flybye.app",
    password: "Demo2026!",
    displayName: "Marco",
    birthdate: "1990-11-02",
    bio: "Photographer. Always trying the airport whisky.",
    vibes: ["Photography", "Adventure"],
    airport: "LAX",
    departsInH: 3,
    photoUrl: "https://i.pravatar.cc/600?img=15",
  },
  {
    email: "demo-rin@flybye.app",
    password: "Demo2026!",
    displayName: "Rin",
    birthdate: "1996-05-23",
    bio: "Three-hour layover. Looking for someone to argue about coffee.",
    vibes: ["Foodie", "Solo travel"],
    airport: "LAX",
    departsInH: 5,
    photoUrl: "https://i.pravatar.cc/600?img=49",
  },
  {
    email: "demo-tomas@flybye.app",
    password: "Demo2026!",
    displayName: "Tomás",
    birthdate: "1992-09-14",
    bio: "Business travel turned vacation. Open to spontaneous plans.",
    vibes: ["Business", "Adventure", "Music"],
    airport: "LAX",
    departsInH: 7,
    photoUrl: "https://i.pravatar.cc/600?img=22",
  },
];

async function fetchAvatar(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`avatar fetch ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function ensureUser(d: Demo): Promise<string> {
  // try to look up first
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email === d.email);
  if (existing) {
    console.log(`  · ${d.email} already exists → ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { display_name: d.displayName, birthdate: d.birthdate },
  });
  if (error) throw error;
  console.log(`  + created ${d.email} → ${data.user.id}`);
  return data.user.id;
}

async function uploadAvatar(userId: string, photoUrl: string): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  const bytes = await fetchAvatar(photoUrl);
  const { error } = await sb.storage.from("avatars").upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function seedOne(d: Demo) {
  console.log(`→ ${d.displayName} (${d.airport})`);
  const userId = await ensureUser(d);

  const photoPath = await uploadAvatar(userId, d.photoUrl);

  const { error: profErr } = await sb.from("profiles").upsert({
    id: userId,
    display_name: d.displayName,
    bio: d.bio,
    birthdate: d.birthdate,
    vibe_tags: d.vibes,
    photos: [photoPath],
    is_verified: true, // pre-approve demo users
  });
  if (profErr) throw profErr;

  const departure = new Date(Date.now() + d.departsInH * 3600 * 1000);
  const { error: flightErr } = await sb.from("flights").upsert(
    {
      user_id: userId,
      airport_iata: d.airport,
      flight_number: null,
      departure_time: departure.toISOString(),
      active_until: departure.toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (flightErr) {
    // unique partial index "one active per user" — delete any old row + retry
    await sb.from("flights").delete().eq("user_id", userId);
    await sb.from("flights").insert({
      user_id: userId,
      airport_iata: d.airport,
      flight_number: null,
      departure_time: departure.toISOString(),
      active_until: departure.toISOString(),
    });
  }

  // record the verification as approved (matches the approve_verification RPC)
  await sb.from("verification_requests").upsert({
    user_id: userId,
    selfie_url: photoPath, // reuse the avatar as a stand-in
    status: "approved",
    reviewed_at: new Date().toISOString(),
  });

  console.log(`  ✓ ${d.displayName} ready at ${d.airport}`);
}

async function main() {
  for (const d of DEMOS) {
    await seedOne(d);
  }
  console.log("\nDone. Reviewer login → reviewer@flybye.app / ReviewMe2026!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
