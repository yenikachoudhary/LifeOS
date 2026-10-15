from datetime import datetime, timezone
import time
from typing import Any
import httpx

_CACHED_CONTESTS: list[dict[str, Any]] = []
_LAST_FETCH_TIME: float = 0
_CACHE_TTL_SECONDS = 600  # 10 minutes cache


async def fetch_codeforces_contests() -> list[dict[str, Any]]:
    contests = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://codeforces.com/api/contest.list?gym=false")
            if resp.status_code == 200:
                data = resp.json().get("result", [])
                for c in data:
                    if c.get("phase") in ("BEFORE", "CODING"):
                        cid = c.get("id")
                        start_ts = c.get("startTimeSeconds", 0)
                        start_dt = datetime.fromtimestamp(start_ts, tz=timezone.utc)
                        duration = c.get("durationSeconds", 7200) // 60
                        is_live = c.get("phase") == "CODING"
                        contests.append({
                            "id": f"cf_{cid}",
                            "name": c.get("name", "Codeforces Contest"),
                            "platform": "Codeforces",
                            "url": f"https://codeforces.com/contestRegistration/{cid}",
                            "start_time": start_dt.isoformat(),
                            "duration_minutes": duration,
                            "status": "live" if is_live else "upcoming",
                            "icon": "🏆",
                        })
    except Exception as e:
        print(f"Error fetching Codeforces contests: {e}")
    return contests


async def fetch_leetcode_contests() -> list[dict[str, Any]]:
    contests = []
    query = """
    query upcomingContests {
      upcomingContests {
        title
        titleSlug
        startTime
        duration
      }
    }
    """
    try:
        headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://leetcode.com/graphql", json={"query": query}, headers=headers)
            if resp.status_code == 200:
                data = resp.json().get("data", {}).get("upcomingContests", [])
                now_ts = int(time.time())
                for c in data:
                    start_ts = c.get("startTime", 0)
                    duration_sec = c.get("duration", 5400)
                    start_dt = datetime.fromtimestamp(start_ts, tz=timezone.utc)
                    is_live = start_ts <= now_ts < (start_ts + duration_sec)
                    slug = c.get("titleSlug", "")
                    contests.append({
                        "id": f"lc_{slug}",
                        "name": c.get("title", "LeetCode Contest"),
                        "platform": "LeetCode",
                        "url": f"https://leetcode.com/contest/{slug}/",
                        "start_time": start_dt.isoformat(),
                        "duration_minutes": duration_sec // 60,
                        "status": "live" if is_live else "upcoming",
                        "icon": "🧩",
                    })
    except Exception as e:
        print(f"Error fetching LeetCode contests: {e}")
    return contests


async def fetch_codechef_contests() -> list[dict[str, Any]]:
    contests = []
    url = "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all"
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                future = data.get("future_contests", [])
                present = data.get("present_contests", [])

                for c in present:
                    code = c.get("contest_code", "")
                    start_iso = c.get("contest_start_date_iso") or datetime.now(timezone.utc).isoformat()
                    contests.append({
                        "id": f"cc_{code}",
                        "name": c.get("contest_name", "CodeChef Contest"),
                        "platform": "CodeChef",
                        "url": f"https://www.codechef.com/{code}",
                        "start_time": start_iso,
                        "duration_minutes": int(c.get("contest_duration", 120)),
                        "status": "live",
                        "icon": "⭐",
                    })

                for c in future:
                    code = c.get("contest_code", "")
                    start_iso = c.get("contest_start_date_iso")
                    if start_iso:
                        contests.append({
                            "id": f"cc_{code}",
                            "name": c.get("contest_name", "CodeChef Contest"),
                            "platform": "CodeChef",
                            "url": f"https://www.codechef.com/{code}",
                            "start_time": start_iso,
                            "duration_minutes": int(c.get("contest_duration", 120)),
                            "status": "upcoming",
                            "icon": "⭐",
                        })
    except Exception as e:
        print(f"Error fetching CodeChef contests: {e}")
    return contests


async def get_all_upcoming_contests(force_refresh: bool = False) -> list[dict[str, Any]]:
    global _CACHED_CONTESTS, _LAST_FETCH_TIME

    now = time.time()
    if not force_refresh and _CACHED_CONTESTS and (now - _LAST_FETCH_TIME < _CACHE_TTL_SECONDS):
        return _CACHED_CONTESTS

    cf = await fetch_codeforces_contests()
    lc = await fetch_leetcode_contests()
    cc = await fetch_codechef_contests()

    all_contests = cf + lc + cc
    # Sort by start_time ascending
    all_contests.sort(key=lambda x: x.get("start_time", ""))

    _CACHED_CONTESTS = all_contests
    _LAST_FETCH_TIME = now
    return _CACHED_CONTESTS
