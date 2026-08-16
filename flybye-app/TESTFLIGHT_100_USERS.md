# TestFlight Playbook — 100 Users in Week 1

## TL;DR

Apple's TestFlight tiers:

| Tier | Cap | Setup time | Review needed |
|---|---|---|---|
| **Internal** | 100 testers | Instant | None |
| **External** | 10,000 testers | ~24h first build | Apple's brief Beta App Review |
| **Public link** | counts toward External | Instant after first external build approved | One-time per major version |

**Strategy for 100 users in week 1:** ship to Internal first (today), iterate for 2–3 days, then promote to External + open a public link to scale recruiting.

---

## 1. Internal Testing — get 100 today

Internal testers must be added to your **App Store Connect Users** with the role **Customer Support** or **Developer** or **Admin**. Each gets up to 100 builds tested across all your apps. Builds are available **within minutes** of upload — no review.

### Step-by-step

1. App Store Connect → **Users and Access** → **+** for each tester.
2. Set **Role** to "Developer" (lowest sufficient role for TestFlight access).
3. Check the box for the **FlyBye** app under "Apps."
4. Each tester gets an email; they accept and install **TestFlight** from the App Store.
5. App Store Connect → **TestFlight** → **Internal Testing** → create a group ("Founders' Circle"), add testers, attach the latest build.

### What 100 internal slots is realistic for

- You + cofounders + early advisors
- Friends-of-friends who were already going to test
- Engineering team

The 100 number is a fact about Apple's tier, not a recruitment target. For real volume go External.

---

## 2. External Testing — scale to 100+ real users

External testing requires a **one-time Beta App Review** for each major version (subsequent build uploads in the same version don't re-review unless metadata changes). Review usually takes **24h** but can take 48–72h on busy weekends.

### Setup

1. App Store Connect → **TestFlight** → **External Testing** → create a group ("Layover Crew" or whatever).
2. Attach a build, fill in **What to Test** (release notes for testers — see template below) and **Beta App Description**.
3. Submit for Beta Review. Apple checks: app launches, crash on a few flows, basic guideline 1.2 compliance.
4. Once approved, invite testers individually OR turn on the **public link**.

### Public link

In the External Testing group, toggle **Enable Public Link**. Anyone with the URL can request access (you can set a cap; recommend 100–500 to start). Drop the link into:

- A "Get the beta" section on flybye.app
- Twitter/X bio
- Reddit posts in r/solotravel, r/travel, r/flying (read each sub's self-promotion rules first)
- Hacker News Show HN ("Show HN: FlyBye — a TestFlight beta for meeting travelers at airports")
- Personal Slacks, frequent flyer Discords

### Sample "What to Test" copy

```
Welcome to the FlyBye beta ✈️

Try the core loop:
1. Sign up + take a profile photo and a verification selfie
2. Add your flight (or any flight you'd like to "fake")
3. Swipe through the deck for that airport
4. Match with someone and chat

Things we'd love feedback on:
- Did onboarding feel quick?
- Was the verification step clear?
- Are the airport autocomplete results showing what you expect?
- Anything that crashed or looked broken?

Tap the feedback icon in TestFlight to send screenshots + notes — they
land directly in our inbox. Thank you for flying with us 🛫
```

---

## 3. Recruitment plan to hit 100 in week 1

| Source | Target | Effort | Notes |
|---|---|---|---|
| Personal network | 25 | low | DM the 25 friends most likely to actually try a flight app |
| Frequent-flyer subreddits | 30 | medium | Post once in r/solotravel + r/Flights with the public link |
| HN Show HN | 20 | low | One post Tuesday morning EST = ~150 visits, ~20 conversions if hook is strong |
| Twitter/X | 15 | low | Pin a tweet with the link; ask travel/aviation accounts to retweet |
| Travel Discord servers | 10 | medium | Find 3–5 large ones, announce in #beta or #self-promo channels |
| **Total** | **~100** | | |

### Hook copy (use across channels)

```
We built FlyBye — a way to meet other travelers at your airport.
Verified profiles, swipe to match, chat in real time before your gate
closes. Looking for 100 testers for the iOS beta this week.

Public TestFlight: <link>
```

---

## 4. What to watch in week 1

Track these in Supabase to know if the loop is working:

```sql
-- daily new signups
select date_trunc('day', created_at) d, count(*)
from auth.users group by 1 order by 1;

-- profiles that completed verification
select count(*) filter (where is_verified) verified,
       count(*) total
from profiles;

-- flights added (= app actually getting opened)
select date_trunc('day', created_at) d, count(*)
from flights group by 1 order by 1;

-- swipes per active flight
select count(*)::float / nullif((select count(*) from flights where active_until > now()), 0)
from swipes where created_at > now() - interval '24 hours';

-- matches that turned into chats
select
  (select count(*) from matches) total_matches,
  (select count(*) from matches where last_message_at is not null) chatting,
  round(100.0 * (select count(*) from matches where last_message_at is not null) /
        nullif((select count(*) from matches), 0), 1) || '%' chat_rate;
```

Goal week-1 health: **>50% of signups complete onboarding, >30% of completed users add a flight, >20% of matches send at least one message**. Anything below these means there's friction in that step.

---

## 5. After week 1

If the metrics look good:

1. Submit for full **App Store Review** (separate from Beta Review). Use `APP_REVIEW_NOTES.md`.
2. Keep TestFlight running in parallel — your beta testers will continue to get updates faster than App Store users.
3. Plan v1.1: in-app account deletion (required), push notifications, geofence "you're at the airport" detection.
