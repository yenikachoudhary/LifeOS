from datetime import datetime, timezone
import re
from typing import Any
import httpx

from ..db import db


def _clean_handle(handle_or_url: str) -> str:
    handle = handle_or_url.strip().rstrip("/")
    if "codechef.com/users/" in handle:
        handle = handle.split("codechef.com/users/")[-1].split("/")[0]
    elif "codechef.com/" in handle:
        parts = handle.split("codechef.com/")[-1].split("/")
        if parts[0] != "dashboard":
            handle = parts[0]
    return handle


async def fetch_codechef_profile(handle_or_url: str) -> dict[str, Any]:
    handle = _clean_handle(handle_or_url)
    if not handle or handle == "dashboard":
        raise ValueError("Please provide your CodeChef username (e.g. glitch_1207).")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    url = f"https://www.codechef.com/users/{handle}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            raise ValueError(f"CodeChef user '{handle}' not found.")
        html = resp.text

    rating_m = re.search(r'class="rating-number"[^>]*>\s*(\d+)', html)
    rating = int(rating_m.group(1)) if rating_m else 0

    stars_count = len(re.findall(r'&#9733;', html))
    div_m = re.search(r'\((Div\s*\d+)\)', html)
    division = div_m.group(1) if div_m else "Div 4"

    contests_m = re.search(r'No\.\s*of\s*Contests\s*Participated:\s*<b>(\d+)</b>', html, re.I)
    contests_count = int(contests_m.group(1)) if contests_m else 0

    probs_m = re.search(r'Total Problems Solved:\s*<b>(\d+)</b>', html, re.I) or re.search(r'Problems Solved[^<]*</h3>\s*<h5>\s*(\d+)', html, re.I)
    problems_count = int(probs_m.group(1)) if probs_m else 0

    name_m = re.search(r'class="m-username--link"[^>]*>([^<]+)</a>', html) or re.search(r'User Profile for ([^|]+)\|', html)
    display_name = name_m.group(1).strip() if name_m else handle

    return {
        "handle": handle,
        "name": display_name,
        "profile_url": url,
        "rating": rating,
        "stars": f"{stars_count} Star" if stars_count else "1 Star",
        "division": division,
        "contests_count": contests_count,
        "problems_solved": problems_count,
        "status": "connected",
        "source": "public_profile",
    }


async def sync_codechef_activity(user_id: str, handle_or_url: str) -> dict[str, Any]:
    handle = _clean_handle(handle_or_url)
    profile = await fetch_codechef_profile(handle)
    now_iso = datetime.now(timezone.utc).isoformat()
    today_str = now_iso[:10]

    # Create an activity event if rating exists and not logged
    if profile.get("rating"):
        db.external_activities.update_one(
            {"user_id": user_id, "source": "codechef", "external_id": f"cc_{handle}_rating"},
            {
                "$set": {
                    "user_id": user_id,
                    "source": "codechef",
                    "external_id": f"cc_{handle}_rating",
                    "type": "rating_update",
                    "title": f"CodeChef Rating: {profile['rating']} ({profile['stars']}, {profile['division']})",
                    "description": f"Contests participated: {profile['contests_count']}",
                    "url": profile["profile_url"],
                    "date": today_str,
                    "timestamp": now_iso,
                    "metadata": profile,
                }
            },
            upsert=True,
        )

    db.developer_profiles.update_one(
        {"user_id": user_id, "platform": "codechef"},
        {
            "$set": {
                "user_id": user_id,
                "platform": "codechef",
                "handle": handle,
                "profile_url": profile["profile_url"],
                "status": "connected",
                "last_synced": now_iso,
                "stats": profile,
                "error_message": None,
            }
        },
        upsert=True,
    )

    return {"synced_count": 1, "profile": profile}
