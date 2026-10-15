from datetime import datetime, timezone
from typing import Any
import httpx

from ..db import db


def _clean_handle(handle_or_url: str) -> str:
    handle = handle_or_url.strip().rstrip("/")
    if "codeforces.com/profile/" in handle:
        handle = handle.split("codeforces.com/profile/")[-1].split("/")[0]
    return handle


async def fetch_codeforces_profile(handle_or_url: str) -> dict[str, Any]:
    handle = _clean_handle(handle_or_url)
    headers = {"User-Agent": "LifeOS-Platform"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"https://codeforces.com/api/user.info?handles={handle}", headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"Codeforces API returned HTTP {resp.status_code}")
        body = resp.json()

    if body.get("status") != "OK" or not body.get("result"):
        raise ValueError(f"Codeforces handle '{handle}' not found.")

    u = body["result"][0]
    return {
        "handle": handle,
        "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or handle,
        "avatar_url": u.get("titlePhoto") or u.get("avatar"),
        "profile_url": f"https://codeforces.com/profile/{handle}",
        "rating": u.get("rating", 0),
        "max_rating": u.get("maxRating", 0),
        "rank": u.get("rank", "Unrated"),
        "max_rank": u.get("maxRank", "Unrated"),
        "contribution": u.get("contribution", 0),
    }


async def sync_codeforces_activity(user_id: str, handle_or_url: str) -> dict[str, Any]:
    handle = _clean_handle(handle_or_url)
    profile = await fetch_codeforces_profile(handle)
    headers = {"User-Agent": "LifeOS-Platform"}

    async with httpx.AsyncClient(timeout=12.0) as client:
        sub_resp = await client.get(f"https://codeforces.com/api/user.status?handle={handle}&from=1&count=50", headers=headers)
        submissions = sub_resp.json().get("result", []) if sub_resp.status_code == 200 else []

    new_events_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    solved_problems = set()

    for sub in submissions:
        if sub.get("verdict") == "OK":
            sub_id = str(sub.get("id"))
            prob = sub.get("problem", {})
            name = prob.get("name", "Unknown Problem")
            contest_id = prob.get("contestId")
            index = prob.get("index", "")
            solved_problems.add(f"{contest_id}{index}" if contest_id else name)

            ts = sub.get("creationTimeSeconds", 0)
            sub_time = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else datetime.now(timezone.utc)
            date_str = sub_time.strftime("%Y-%m-%d")
            iso_str = sub_time.isoformat()

            url = f"https://codeforces.com/contest/{contest_id}/problem/{index}" if contest_id and index else f"https://codeforces.com/profile/{handle}"
            tags = ", ".join(prob.get("tags", []))

            res = db.external_activities.update_one(
                {"user_id": user_id, "source": "codeforces", "external_id": f"cf_{sub_id}"},
                {
                    "$setOnInsert": {
                        "user_id": user_id,
                        "source": "codeforces",
                        "external_id": f"cf_{sub_id}",
                        "type": "problem_solved",
                        "title": f"Codeforces Accepted: {name} ({index})",
                        "description": f"Tags: {tags}" if tags else "Accepted submission",
                        "url": url,
                        "date": date_str,
                        "timestamp": iso_str,
                        "metadata": {"contestId": contest_id, "index": index, "rating": prob.get("rating")},
                    }
                },
                upsert=True,
            )
            if res.upserted_id:
                new_events_count += 1

    profile["total_solved"] = len(solved_problems)

    db.developer_profiles.update_one(
        {"user_id": user_id, "platform": "codeforces"},
        {
            "$set": {
                "user_id": user_id,
                "platform": "codeforces",
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

    return {"synced_count": new_events_count, "profile": profile}
