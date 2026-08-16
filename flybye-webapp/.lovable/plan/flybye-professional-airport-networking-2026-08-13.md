# FlyBye → Professional Airport Networking

Reposition FlyBye from a travel dating app into a professional networking app for people flying and waiting in terminals — "LinkedIn for the airport." Scope is rebrand + UI: all copy, visuals and profile presentation change; the underlying matching, discovery, chat and verification mechanics stay exactly as they are.

## New brand direction

- **Palette — Navy Trust:** deep navy `#0f1b3d` background, `#1e3a5f` surfaces, `#3b6fa0` primary accent, `#e8edf3` foreground. Replaces the current teal-on-charcoal scheme.
- **Typography:** Libre Baskerville for headings (institutional, credible), IBM Plex Sans for body/UI.
- **Tone:** restrained and corporate — tighter radii, flatter surfaces, less glow and neon, more structure and whitespace. No hearts, no romance imagery.
- **Positioning line direction:** "Meet professionals at your terminal" — layovers become networking windows.

## Landing page

- Hero rewritten around business travel: connect with professionals during layovers, at lounges and in terminals.
- Primary CTA "Start Matching" → "Start Connecting".
- Hero preview cards become professional cards: name, role, company, industry, airport, layover window — no age, no romance badges.
- Feature blocks reframed: Terminal Matching → industry and role relevance; Safety/Verification → verified professional identity; Live location → meet at your terminal between flights.
- Stats reframed (e.g. "12K+ Matches" → "12K+ Connections made").
- Testimonials rewritten as business outcomes (a deal, a hire, a mentor, a co-founder intro) instead of dates and friendships.
- "How it works" steps reworded: build your professional profile → add flights and layovers → connect and meet at the terminal.

## Discovery screen (card grid)

- Replace the swipe deck with a uniform professional card grid, so travelers can scan everyone at their terminal at once.
- Each card shows: photo, name, role and company, industry tag, verification badge, airport/terminal and layover window, with a single **Connect** action (and a dismiss).
- Keep the existing connect/pass logic, verification gate, browse-mode banner, airport activity banner and Cards/Map toggle behavior unchanged — only the presentation changes.
- Retain the swipe interaction as the mobile-friendly fallback where it makes sense, restyled without heart iconography.

## Profile screen

- "Connection mode" options relabelled as networking intents: **Hiring / Job seeking**, **Business & partnerships**, **Mentorship**, **Open to networking** (stored in the same existing field values, so no data migration).
- Bio prompt becomes a professional summary; "travel style" and interests reframed as industry, role and areas of interest — presented through the existing fields.
- Gender / gender-preference controls removed from the UI (data untouched) since they are not part of a professional networking flow.
- Verification framed as professional identity verification.

## Matches, chat and elsewhere

- "Matches" → "Connections"; pending/accepted tabs become "Requests" / "Connected".
- Heart iconography swapped for handshake/briefcase-style icons across the app.
- Navbar, footer, auth pages, PWA manifest name/description and page metadata updated to the professional positioning.
- Legal pages: dating-specific wording (romance, dates) adjusted to professional networking language; no structural legal changes.

## Technical notes

- Tokens: rewrite the HSL variables in `src/index.css` (background, card, primary, accent, glass, glow, sidebar) to the Navy Trust palette; swap the Google Fonts import and `fontFamily.display` / `fontFamily.body` in `tailwind.config.ts` to Libre Baskerville / IBM Plex Sans. All components keep using semantic tokens — no hardcoded colors.
- Files touched: `src/index.css`, `tailwind.config.ts`, `index.html`, `vite.config.ts` (manifest strings), `src/pages/Index.tsx`, `src/pages/Discover.tsx`, `src/pages/Profile.tsx`, `src/pages/Matches.tsx`, `src/pages/Chat.tsx`, `src/components/ProfileCard.tsx`, `src/components/SwipeCard.tsx`, `src/components/FeatureCard.tsx`, `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/components/Illustrations.tsx`, auth pages, and legal page copy.
- No database migrations, no changes to hooks' query logic, RLS, edge functions or the MCP server. `connection_mode` keeps its existing stored values; only labels change.
- Project memory entries that describe FlyBye as a dating platform (positioning, visual identity, connection modes, gender matching) get updated to the new direction.
