/**
 * FlyBye — seed demo professionals for App Review + early testing.
 *
 * Creates the App Review account plus 3 verified demo professionals at each
 * launch airport (business profile, headshot, active flight), so Discover is
 * never empty for early testers.
 *
 * Run with:
 *   export SUPABASE_URL='https://pngjuliouszzhylkimsd.supabase.co'
 *   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'   # from dashboard → API
 *   npm run seed                 # create / refresh
 *   npm run seed -- --remove     # delete every demo-*@flybye.app user
 *
 * Idempotent: re-running keeps existing users and refreshes their presence
 * window. Presence lasts PRESENCE_DAYS, so re-run at least that often (or
 * schedule it) to keep Discover populated.
 *
 * Demo users all have emails like demo-<slug>@flybye.app, which is how
 * `--remove` finds them.
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

const PRESENCE_DAYS = 14;
const DEMO_PASSWORD = "Demo2026!";

const AIRPORTS = [
  "JFK", "LGA", "EWR", "LAX", "SFO", "ORD",
  "ATL", "MIA", "BOS", "DFW", "LHR", "DXB",
];

type Intent = "hiring" | "partnerships" | "mentorship" | "networking";

type Persona = {
  name: string;
  gender: "men" | "women"; // randomuser.me portrait folder
  role: string;
  company: string;
  industry: string;
  intent: Intent;
  bio: string;
};

// One persona per demo user; AIRPORTS.length * 3 of them.
const PERSONAS: Persona[] = [
  { name: "Jamie Chen", gender: "women", role: "Product Lead", company: "Northwind Labs", industry: "SaaS", intent: "networking", bio: "Building B2B workflow tools. Happy to swap notes on product-led growth." },
  { name: "Marcus Bell", gender: "men", role: "VP Sales", company: "Brightline Freight", industry: "Logistics", intent: "partnerships", bio: "Scaling a freight-tech sales team across the East Coast." },
  { name: "Priya Raman", gender: "women", role: "Founder & CEO", company: "Ledgerly", industry: "Fintech", intent: "partnerships", bio: "Seed-stage fintech for SMB bookkeeping. Always up for a coffee chat." },
  { name: "Tomás Herrera", gender: "men", role: "Engineering Manager", company: "Cloudpeak", industry: "Cloud infrastructure", intent: "hiring", bio: "Hiring backend and SRE folks. Ask me about remote-first teams." },
  { name: "Aisha Okafor", gender: "women", role: "Partner", company: "Harbor Ventures", industry: "Venture capital", intent: "networking", bio: "Early-stage investor in climate and health. Between board meetings." },
  { name: "Daniel Kim", gender: "men", role: "Head of Design", company: "Mosaic Health", industry: "Healthtech", intent: "mentorship", bio: "Design leader. Glad to mentor anyone moving into product design." },
  { name: "Sofia Rossi", gender: "women", role: "Brand Director", company: "Atelier Nove", industry: "Fashion", intent: "partnerships", bio: "Looking for retail and hospitality brand collaborations." },
  { name: "Ethan Brooks", gender: "men", role: "Management Consultant", company: "Clearpoint Advisory", industry: "Consulting", intent: "networking", bio: "Operations strategy for mid-market manufacturers." },
  { name: "Mei Tanaka", gender: "women", role: "Data Science Lead", company: "Quantive", industry: "AI / ML", intent: "hiring", bio: "Hiring ML engineers. Can talk LLM evals for hours." },
  { name: "Omar Haddad", gender: "men", role: "Regional Director", company: "Gulfstream Hospitality", industry: "Hospitality", intent: "partnerships", bio: "Opening three hotels next year. Keen to meet suppliers and operators." },
  { name: "Laura Fischer", gender: "women", role: "General Counsel", company: "Vantage Robotics", industry: "Robotics", intent: "mentorship", bio: "In-house counsel at a robotics startup. Happy to help early founders." },
  { name: "Jordan Price", gender: "men", role: "Account Executive", company: "Signalwave", industry: "Martech", intent: "networking", bio: "On the road most weeks. Always happy to meet fellow road warriors." },
  { name: "Elena Petrova", gender: "women", role: "CTO", company: "Fieldnote", industry: "Agtech", intent: "hiring", bio: "Building software for farms. Hiring mobile engineers." },
  { name: "Kwame Mensah", gender: "men", role: "Investment Associate", company: "Meridian Capital", industry: "Private equity", intent: "networking", bio: "Covering consumer and fintech deals. Layover at the gate bar." },
  { name: "Hannah Weiss", gender: "women", role: "Head of People", company: "Brightpath", industry: "HR tech", intent: "mentorship", bio: "People ops nerd. Ask me about building culture in hybrid teams." },
  { name: "Luis Ortega", gender: "men", role: "Supply Chain Director", company: "Andes Foods", industry: "Food & beverage", intent: "partnerships", bio: "Sourcing partners across LATAM and the US." },
  { name: "Grace Liu", gender: "women", role: "Growth Marketing Manager", company: "Pathwise", industry: "Edtech", intent: "networking", bio: "Growth for an edtech platform. Swapping playbooks welcome." },
  { name: "Ryan O'Connor", gender: "men", role: "Founder", company: "Tidewater Energy", industry: "Climate", intent: "partnerships", bio: "Building grid-scale storage. Looking for utility and project partners." },
  { name: "Nadia Haddad", gender: "women", role: "Senior Architect", company: "Studio Forma", industry: "Architecture", intent: "networking", bio: "Designing airports, ironically. Happy to talk terminal design." },
  { name: "Ben Carter", gender: "men", role: "Chief of Staff", company: "Relay Health", industry: "Healthtech", intent: "mentorship", bio: "Ex-consultant turned startup operator. Glad to share what I've learned." },
  { name: "Isabella Moreau", gender: "women", role: "Creative Director", company: "Maison Lumen", industry: "Media", intent: "partnerships", bio: "Leading campaigns for luxury brands. Open to creative collabs." },
  { name: "Arjun Mehta", gender: "men", role: "Product Manager", company: "Paycircle", industry: "Fintech", intent: "networking", bio: "Payments PM. Always curious how other teams ship." },
  { name: "Chloe Martin", gender: "women", role: "Recruiting Lead", company: "Talentbridge", industry: "Recruiting", intent: "hiring", bio: "Recruiting senior engineers and PMs for growth-stage startups." },
  { name: "Samuel Adeyemi", gender: "men", role: "Solutions Architect", company: "Stackline Cloud", industry: "Cloud infrastructure", intent: "networking", bio: "Helping enterprises migrate to the cloud. Long layover, say hi." },
  { name: "Yuki Sato", gender: "women", role: "UX Researcher", company: "Kinetic Mobility", industry: "Mobility", intent: "mentorship", bio: "Researching how people move through cities. Happy to mentor." },
  { name: "Michael Grant", gender: "men", role: "CFO", company: "Northbeam Retail", industry: "Retail", intent: "networking", bio: "Finance leader at a retail chain. Interested in retail-tech." },
  { name: "Fatima Zahra", gender: "women", role: "Business Development Manager", company: "Oasis Logistics", industry: "Logistics", intent: "partnerships", bio: "Building trade lanes between the Gulf and Europe." },
  { name: "Lucas Silva", gender: "men", role: "Co-founder", company: "Trailmark", industry: "Travel tech", intent: "partnerships", bio: "Building tools for business travellers. Let's compare notes." },
  { name: "Olivia Turner", gender: "women", role: "Director of Operations", company: "Crescent Biotech", industry: "Biotech", intent: "networking", bio: "Ops for a clinical-stage biotech. Heading to a conference." },
  { name: "David Cohen", gender: "men", role: "Angel Investor", company: "Independent", industry: "Venture capital", intent: "mentorship", bio: "Former founder, now angel investing. Glad to give feedback on pitches." },
  { name: "Zara Ahmed", gender: "women", role: "Software Engineer", company: "Finch AI", industry: "AI / ML", intent: "networking", bio: "Building agents for customer support. Always up for tech talk." },
  { name: "Henry Walsh", gender: "men", role: "Sales Director", company: "Ironclad Security", industry: "Cybersecurity", intent: "partnerships", bio: "Selling security to banks. Looking for channel partners." },
  { name: "Ana Costa", gender: "women", role: "Marketing Director", company: "Verde Beverages", industry: "Food & beverage", intent: "partnerships", bio: "Launching our drinks in new markets. Looking for distributors." },
  { name: "Noah Fischer", gender: "men", role: "Investment Banker", company: "Sterling Partners", industry: "Finance", intent: "networking", bio: "M&A in tech and media. Stuck at the gate, happy to chat." },
  { name: "Leila Nasser", gender: "women", role: "Head of Partnerships", company: "Skyward Rewards", industry: "Travel tech", intent: "partnerships", bio: "Partnering with airlines and hotels on loyalty." },
  { name: "Chris Morgan", gender: "men", role: "Founder", company: "Brickstack", industry: "Proptech", intent: "hiring", bio: "Proptech founder hiring a founding engineer." },
];

type Demo = Persona & {
  email: string;
  airport: string;
  photoUrl: string;
  /** Hours from now until this demo user's flight departs. */
  departsInH: number;
};

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildDemos(): Demo[] {
  const needed = AIRPORTS.length * 3;
  if (PERSONAS.length < needed) {
    throw new Error(`Need ${needed} personas, have ${PERSONAS.length}.`);
  }
  return PERSONAS.slice(0, needed).map((p, i) => ({
    ...p,
    email: `demo-${slug(p.name)}@flybye.app`,
    airport: AIRPORTS[Math.floor(i / 3)],
    photoUrl: `https://randomuser.me/api/portraits/${p.gender}/${(i * 7) % 90 + 1}.jpg`,
    departsInH: 2 + (i % 6),
  }));
}

// App Review account. Verified and at JFK so the reviewer lands on a
// populated Discover screen.
const REVIEWER: Demo = {
  email: "reviewer@flybye.app",
  name: "Alex (Reviewer)",
  gender: "men",
  role: "App Reviewer",
  company: "Apple",
  industry: "Technology",
  intent: "networking",
  bio: "Apple test account.",
  airport: "JFK",
  photoUrl: "https://randomuser.me/api/portraits/men/12.jpg",
  departsInH: 6,
};
const REVIEWER_PASSWORD = "ReviewMe2026!";

async function listAllUsers() {
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function ensureUser(
  d: Demo,
  password: string,
  existing: Map<string, string>,
): Promise<string> {
  const id = existing.get(d.email);
  if (id) return id;

  const { data, error } = await sb.auth.admin.createUser({
    email: d.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: d.name },
  });
  if (error) throw error;
  console.log(`  + created ${d.email}`);
  return data.user.id;
}

async function uploadAvatar(userId: string, photoUrl: string): Promise<string> {
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`avatar fetch ${res.status} for ${photoUrl}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = `${userId}/avatar.jpg`;
  const { error } = await sb.storage.from("avatars").upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function seedOne(d: Demo, password: string, existing: Map<string, string>) {
  const userId = await ensureUser(d, password, existing);
  const avatarPath = await uploadAvatar(userId, d.photoUrl);

  const now = Date.now();
  const departure = new Date(now + d.departsInH * 3600_000);
  const arrival = new Date(departure.getTime() + 5 * 3600_000);
  const presentUntil = new Date(now + PRESENCE_DAYS * 24 * 3600_000);
  // Stagger "last seen" so the feed doesn't look machine-generated.
  const lastSeen = new Date(now - Math.floor(Math.random() * 45) * 60_000);

  const { error: profErr } = await sb.from("profiles").upsert({
    id: userId,
    display_name: d.name,
    avatar_url: avatarPath,
    bio: d.bio,
    role: d.role,
    company: d.company,
    industry: d.industry,
    intent: d.intent,
    home_airport: d.airport,
    current_airport: d.airport,
    present_until: presentUntil.toISOString(),
    verified: true,
    verification_status: "approved",
    last_seen_at: lastSeen.toISOString(),
  });
  if (profErr) throw profErr;

  // Single active leg per user, same as the app's flight-entry screen.
  await sb.from("flights").delete().eq("user_id", userId);
  const destination = AIRPORTS[(AIRPORTS.indexOf(d.airport) + 5) % AIRPORTS.length];
  const { error: flightErr } = await sb.from("flights").insert({
    user_id: userId,
    flight_number: null,
    departure_airport: d.airport,
    arrival_airport: destination,
    departure_time: departure.toISOString(),
    arrival_time: arrival.toISOString(),
  });
  if (flightErr) throw flightErr;

  console.log(`  ✓ ${d.name} at ${d.airport}`);
}

async function removeDemos() {
  const users = await listAllUsers();
  const demos = users.filter((u) => u.email?.match(/^demo-.*@flybye\.app$/));
  for (const u of demos) {
    await sb.storage.from("avatars").remove([`${u.id}/avatar.jpg`]);
    const { error } = await sb.auth.admin.deleteUser(u.id);
    if (error) throw error;
    console.log(`  - removed ${u.email}`);
  }
  console.log(`\nRemoved ${demos.length} demo users.`);
}

async function main() {
  if (process.argv.includes("--remove")) return removeDemos();

  const existing = new Map(
    (await listAllUsers())
      .filter((u) => u.email)
      .map((u) => [u.email!, u.id] as [string, string]),
  );

  console.log("→ Reviewer");
  await seedOne(REVIEWER, REVIEWER_PASSWORD, existing);

  const demos = buildDemos();
  for (const airport of AIRPORTS) {
    console.log(`→ ${airport}`);
    for (const d of demos.filter((x) => x.airport === airport)) {
      await seedOne(d, DEMO_PASSWORD, existing);
    }
  }
  console.log(
    `\nDone. ${demos.length} demo users across ${AIRPORTS.length} airports, ` +
      `present for ${PRESENCE_DAYS} days.` +
      `\nReviewer login → ${REVIEWER.email} / ${REVIEWER_PASSWORD}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
