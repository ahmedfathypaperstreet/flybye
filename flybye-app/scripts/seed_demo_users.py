#!/usr/bin/env python3
"""
FlyBye — seed demo users for App Review + early testing.
Pure stdlib version (no pip install needed).

  export SUPABASE_URL='https://rxipszdcbvrevuyqpncq.supabase.co'
  export SUPABASE_SERVICE_ROLE_KEY='<your fresh secret key>'
  python3 seed_demo_users.py

Creates 6 verified profiles (3 at JFK, 3 at LAX) with photos, active
flights, and approved verifications. Idempotent — safe to re-run.
"""

import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta, timezone

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not URL or not KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.", file=sys.stderr)
    sys.exit(1)

JSON_HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def request(method, path, *, body=None, headers=None, raw_body=None,
            content_type=None, params=None):
    """One HTTP call. Returns (status, parsed_json_or_bytes)."""
    full = URL + path
    if params:
        full += "?" + urllib.parse.urlencode(params)

    h = dict(JSON_HEADERS)
    if headers:
        h.update(headers)
    if content_type:
        h["Content-Type"] = content_type

    if raw_body is not None:
        data = raw_body
    elif body is not None:
        data = json.dumps(body).encode()
    else:
        data = None

    req = urllib.request.Request(full, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            content = r.read()
            ctype = r.headers.get("Content-Type", "")
            if "application/json" in ctype and content:
                return r.status, json.loads(content)
            return r.status, content
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        return e.code, body


# ── helpers ────────────────────────────────────────────────────────────

def list_users():
    status, data = request("GET", "/auth/v1/admin/users",
                            params={"per_page": 200})
    if status >= 400:
        raise RuntimeError(f"list users {status}: {data}")
    return data.get("users", [])


def create_user(email, password, display_name, birthdate):
    status, data = request("POST", "/auth/v1/admin/users", body={
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "display_name": display_name,
            "birthdate": birthdate,
        },
    })
    if status >= 400:
        raise RuntimeError(f"create user {email} → {status}: {data}")
    return data["id"]


def fetch_url(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
                      "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                      "Version/17.0 Safari/605.1.15",
        "Accept": "image/*,*/*;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"avatar fetch {url} → {e.code} {e.reason}")


def ensure_bucket(bucket_id, public):
    status, _ = request("GET", f"/storage/v1/bucket/{bucket_id}")
    if status == 200:
        return  # already exists
    status, data = request("POST", "/storage/v1/bucket", body={
        "id": bucket_id,
        "name": bucket_id,
        "public": public,
    })
    if status >= 400 and "already exists" not in str(data):
        raise RuntimeError(f"create bucket {bucket_id} → {status}: {data}")
    print(f"  + created bucket {bucket_id} (public={public})")


def upload_to_bucket(bucket, path, image_bytes):
    # Use POST with x-upsert: true so re-runs overwrite cleanly
    status, data = request(
        "POST", f"/storage/v1/object/{bucket}/{path}",
        raw_body=image_bytes,
        content_type="image/jpeg",
        headers={"x-upsert": "true"},
    )
    if status >= 400:
        raise RuntimeError(f"upload {bucket}/{path} → {status}: {data}")


def upsert(table, row, on_conflict=None):
    p = "/rest/v1/" + table
    headers = {
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    if on_conflict:
        headers["Prefer"] += f",on_conflict={on_conflict}"
    status, data = request("POST", p, body=row, headers=headers)
    if status >= 400:
        raise RuntimeError(f"upsert {table} → {status}: {data}")
    return data


def delete_where(table, col, val):
    status, data = request("DELETE", f"/rest/v1/{table}",
                            params={col: f"eq.{val}"})
    if status >= 400 and status != 404:
        raise RuntimeError(f"delete from {table} → {status}: {data}")


# ── seed data ──────────────────────────────────────────────────────────

DEMOS = [
    {
        "email": "reviewer@flybye.app",
        "password": "ReviewMe2026!",
        "display_name": "Alex (Reviewer)",
        "birthdate": "1995-04-12",
        "bio": "Apple test account.",
        "vibes": ["Solo travel", "Just landed"],
        "airport": "JFK",
        "departs_in_h": 6,
        "photo_url": "https://randomuser.me/api/portraits/men/12.jpg",
    },
    {
        "email": "demo-jamie@flybye.app",
        "password": "Demo2026!",
        "display_name": "Jamie",
        "birthdate": "1998-07-09",
        "bio": "On a layover. Books and bad airport coffee.",
        "vibes": ["Reading", "Foodie", "Layover"],
        "airport": "JFK",
        "departs_in_h": 4,
        "photo_url": "https://randomuser.me/api/portraits/women/32.jpg",
    },
    {
        "email": "demo-priya@flybye.app",
        "password": "Demo2026!",
        "display_name": "Priya",
        "birthdate": "1994-02-19",
        "bio": "Heading to a wedding. Up for hangar talk.",
        "vibes": ["Foodie", "Music"],
        "airport": "JFK",
        "departs_in_h": 2,
        "photo_url": "https://randomuser.me/api/portraits/women/47.jpg",
    },
    {
        "email": "demo-marco@flybye.app",
        "password": "Demo2026!",
        "display_name": "Marco",
        "birthdate": "1990-11-02",
        "bio": "Photographer. Always trying the airport whisky.",
        "vibes": ["Photography", "Adventure"],
        "airport": "LAX",
        "departs_in_h": 3,
        "photo_url": "https://randomuser.me/api/portraits/men/15.jpg",
    },
    {
        "email": "demo-rin@flybye.app",
        "password": "Demo2026!",
        "display_name": "Rin",
        "birthdate": "1996-05-23",
        "bio": "Three-hour layover. Looking for someone to argue about coffee.",
        "vibes": ["Foodie", "Solo travel"],
        "airport": "LAX",
        "departs_in_h": 5,
        "photo_url": "https://randomuser.me/api/portraits/women/49.jpg",
    },
    {
        "email": "demo-tomas@flybye.app",
        "password": "Demo2026!",
        "display_name": "Tomás",
        "birthdate": "1992-09-14",
        "bio": "Business travel turned vacation. Open to spontaneous plans.",
        "vibes": ["Business", "Adventure", "Music"],
        "airport": "LAX",
        "departs_in_h": 7,
        "photo_url": "https://randomuser.me/api/portraits/men/22.jpg",
    },
]


def seed_one(d, existing_by_email):
    print(f"→ {d['display_name']} ({d['airport']})")

    user = existing_by_email.get(d["email"])
    if user:
        user_id = user["id"]
        print(f"  · already exists → {user_id}")
    else:
        user_id = create_user(
            d["email"], d["password"], d["display_name"], d["birthdate"])
        print(f"  + created → {user_id}")

    # download avatar + upload
    photo_path = f"{user_id}/avatar.jpg"
    img = fetch_url(d["photo_url"])
    upload_to_bucket("avatars", photo_path, img)

    # profile
    upsert("profiles", {
        "id": user_id,
        "display_name": d["display_name"],
        "bio": d["bio"],
        "birthdate": d["birthdate"],
        "vibe_tags": d["vibes"],
        "photos": [photo_path],
        "is_verified": True,
    }, on_conflict="id")

    # flight (replace existing — there's a "one active per user" constraint)
    delete_where("flights", "user_id", user_id)
    departure = datetime.now(timezone.utc) + timedelta(hours=d["departs_in_h"])
    upsert("flights", {
        "user_id": user_id,
        "airport_iata": d["airport"],
        "flight_number": None,
        "departure_time": departure.isoformat(),
        "active_until": departure.isoformat(),
    })

    # verification (pre-approved, reuse avatar as stand-in selfie)
    upsert("verification_requests", {
        "user_id": user_id,
        "selfie_url": photo_path,
        "status": "approved",
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="user_id")

    print(f"  ✓ ready at {d['airport']}")


def main():
    print("→ checking storage buckets")
    ensure_bucket("avatars", public=True)
    ensure_bucket("verifications", public=False)
    print()
    existing = {u["email"]: u for u in list_users()}
    for d in DEMOS:
        seed_one(d, existing)
    print()
    print("Done. Reviewer login → reviewer@flybye.app / ReviewMe2026!")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n✗ {e}", file=sys.stderr)
        sys.exit(1)
