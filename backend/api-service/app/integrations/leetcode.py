from datetime import datetime, timezone
from typing import Any
import httpx

from ..db import db


def _clean_handle(handle_or_url: str) -> str:
    handle = handle_or_url.strip().rstrip("/")
    if "leetcode.com/" in handle:
        parts = handle.split("leetcode.com/")[-1].split("/")
        if parts[0] in ("u", "user"):
            handle = parts[1]
        else:
            handle = parts[0]
    return handle


LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

USER_QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
      realName
      userAvatar
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
  recentAcSubmissionList(username: $username, limit: 30) {
    id
    title
    titleSlug
    timestamp
  }
}
"""


async def fetch_leetcode_profile(handle_or_url: str) -> dict[str, Any]:
    username = _clean_handle(handle_or_url)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LifeOS/1.0",
        "Referer": "https://leetcode.com/",
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(
            LEETCODE_GRAPHQL,
            json={"query": USER_QUERY, "variables": {"username": username}},
            headers=headers,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"LeetCode GraphQL returned status {resp.status_code}")
        body = resp.json()

    matched = body.get("data", {}).get("matchedUser")
    if not matched:
        raise ValueError(f"LeetCode user '{username}' not found.")

    stats_list = matched.get("submitStatsGlobal", {}).get("acSubmissionNum", [])
    counts = {item.get("difficulty"): item.get("count", 0) for item in stats_list}

    return {
        "handle": username,
        "name": matched.get("profile", {}).get("realName") or username,
        "avatar_url": matched.get("profile", {}).get("userAvatar"),
        "ranking": matched.get("profile", {}).get("ranking", 0),
        "profile_url": f"https://leetcode.com/u/{username}/",
        "total_solved": counts.get("All", 0),
        "easy_solved": counts.get("Easy", 0),
        "medium_solved": counts.get("Medium", 0),
        "hard_solved": counts.get("Hard", 0),
        "recent_submissions": body.get("data", {}).get("recentAcSubmissionList", []),
    }


async def sync_leetcode_activity(user_id: str, handle_or_url: str) -> dict[str, Any]:
    username = _clean_handle(handle_or_url)
    profile = await fetch_leetcode_profile(username)
    recent = profile.pop("recent_submissions", [])

    new_events_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for sub in recent:
        sub_id = str(sub.get("id"))
        ts = int(sub.get("timestamp", 0))
        sub_time = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else datetime.now(timezone.utc)
        date_str = sub_time.strftime("%Y-%m-%d")
        iso_str = sub_time.isoformat()
        title = sub.get("title", "LeetCode Problem")
        slug = sub.get("titleSlug", "")
        prob_url = f"https://leetcode.com/problems/{slug}/" if slug else f"https://leetcode.com/u/{username}/"

        res = db.external_activities.update_one(
            {"user_id": user_id, "source": "leetcode", "external_id": sub_id},
            {
                "$setOnInsert": {
                    "user_id": user_id,
                    "source": "leetcode",
                    "external_id": sub_id,
                    "type": "problem_solved",
                    "title": f"Solved LeetCode: {title}",
                    "description": f"Accepted submission on LeetCode #{sub_id}",
                    "url": prob_url,
                    "date": date_str,
                    "timestamp": iso_str,
                    "metadata": {"titleSlug": slug, "platform": "leetcode"},
                }
            },
            upsert=True,
        )
        if res.upserted_id:
            new_events_count += 1

        # Also store into dsa_entries for internal goals & existing DSA tracker
        db.dsa_entries.update_one(
            {"user_id": user_id, "external_id": sub_id},
            {
                "$setOnInsert": {
                    "user_id": user_id,
                    "external_id": sub_id,
                    "date": date_str,
                    "title": title,
                    "difficulty": "Medium",  # fallback difficulty
                    "url": prob_url,
                    "synced": True,
                }
            },
            upsert=True,
        )

    # Update profile in developer_profiles
    db.developer_profiles.update_one(
        {"user_id": user_id, "platform": "leetcode"},
        {
            "$set": {
                "user_id": user_id,
                "platform": "leetcode",
                "handle": username,
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
