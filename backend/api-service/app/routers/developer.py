from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import current_user_id
from ..db import db
from ..integrations.codechef import fetch_codechef_profile, sync_codechef_activity
from ..integrations.codeforces import fetch_codeforces_profile, sync_codeforces_activity
from ..integrations.github import fetch_github_profile, sync_github_activity
from ..integrations.leetcode import fetch_leetcode_profile, sync_leetcode_activity
from ..integrations.unstop import fetch_unstop_profile, sync_unstop_activity
from ..schemas import DeveloperProfileIn, Platform

router = APIRouter(prefix="/developer", tags=["developer"])

ALL_PLATFORMS = ["github", "leetcode", "codeforces", "codechef", "unstop"]

PLATFORM_META = {
    "github": {"name": "GitHub", "icon": "🐙", "baseUrl": "https://github.com/"},
    "leetcode": {"name": "LeetCode", "icon": "🧩", "baseUrl": "https://leetcode.com/u/"},
    "codeforces": {"name": "Codeforces", "icon": "🏆", "baseUrl": "https://codeforces.com/profile/"},
    "codechef": {"name": "CodeChef", "icon": "⭐", "baseUrl": "https://www.codechef.com/users/"},
    "unstop": {"name": "Unstop", "icon": "🚀", "baseUrl": "https://unstop.com/u/"},
}


@router.get("/profiles")
def list_profiles(uid: str = Depends(current_user_id)):
    docs = list(db.developer_profiles.find({"user_id": uid}))
    mapped = {d["platform"]: d for d in docs}

    result = []
    for p in ALL_PLATFORMS:
        entry = mapped.get(p)
        if entry:
            entry["id"] = str(entry.pop("_id"))
            entry.pop("user_id", None)
            entry["meta"] = PLATFORM_META[p]
            result.append(entry)
        else:
            result.append({
                "platform": p,
                "handle": "",
                "profile_url": "",
                "status": "disconnected",
                "last_synced": None,
                "stats": {},
                "error_message": None,
                "meta": PLATFORM_META[p],
            })
    return result


@router.put("/profiles/{platform}")
async def update_profile(platform: Platform, body: DeveloperProfileIn, uid: str = Depends(current_user_id)):
    handle = body.handle.strip()
    profile_url = body.profile_url or f"{PLATFORM_META[platform]['baseUrl']}{handle}"

    # Verify and sync right away
    error_msg = None
    status = "connected"
    stats: dict[str, Any] = {}

    try:
        if platform == "github":
            res = await sync_github_activity(uid, handle)
            stats = res["profile"]
        elif platform == "leetcode":
            res = await sync_leetcode_activity(uid, handle)
            stats = res["profile"]
        elif platform == "codeforces":
            res = await sync_codeforces_activity(uid, handle)
            stats = res["profile"]
        elif platform == "codechef":
            res = await sync_codechef_activity(uid, handle)
            stats = res["profile"]
        elif platform == "unstop":
            res = await sync_unstop_activity(uid, handle)
            stats = res["profile"]
    except Exception as e:
        status = "error"
        error_msg = str(e)

    doc = {
        "user_id": uid,
        "platform": platform,
        "handle": handle,
        "profile_url": profile_url,
        "status": status,
        "last_synced": datetime.now(timezone.utc).isoformat() if status == "connected" else None,
        "stats": stats,
        "error_message": error_msg,
    }
    db.developer_profiles.update_one({"user_id": uid, "platform": platform}, {"$set": doc}, upsert=True)
    return doc


@router.delete("/profiles/{platform}")
def disconnect_profile(platform: Platform, uid: str = Depends(current_user_id)):
    db.developer_profiles.delete_one({"user_id": uid, "platform": platform})
    return {"message": f"{platform} disconnected"}


@router.post("/sync/{platform}")
async def sync_platform(platform: Platform, uid: str = Depends(current_user_id)):
    prof = db.developer_profiles.find_one({"user_id": uid, "platform": platform})
    if not prof or not prof.get("handle"):
        raise HTTPException(400, f"No handle configured for {platform}. Connect it first.")

    handle = prof["handle"]
    try:
        if platform == "github":
            return await sync_github_activity(uid, handle)
        elif platform == "leetcode":
            return await sync_leetcode_activity(uid, handle)
        elif platform == "codeforces":
            return await sync_codeforces_activity(uid, handle)
        elif platform == "codechef":
            return await sync_codechef_activity(uid, handle)
        elif platform == "unstop":
            return await sync_unstop_activity(uid, handle)
    except Exception as e:
        db.developer_profiles.update_one(
            {"user_id": uid, "platform": platform},
            {"$set": {"status": "error", "error_message": str(e)}},
        )
        raise HTTPException(502, f"Failed to sync {platform}: {e}")


@router.post("/sync-all")
async def sync_all_platforms(uid: str = Depends(current_user_id)):
    profiles = list(db.developer_profiles.find({"user_id": uid}))
    results = {}
    for p in profiles:
        platform = p.get("platform")
        handle = p.get("handle")
        if not platform or not handle:
            continue
        try:
            if platform == "github":
                results["github"] = await sync_github_activity(uid, handle)
            elif platform == "leetcode":
                results["leetcode"] = await sync_leetcode_activity(uid, handle)
            elif platform == "codeforces":
                results["codeforces"] = await sync_codeforces_activity(uid, handle)
            elif platform == "codechef":
                results["codechef"] = await sync_codechef_activity(uid, handle)
            elif platform == "unstop":
                results["unstop"] = await sync_unstop_activity(uid, handle)
        except Exception as e:
            results[platform] = {"status": "error", "error": str(e)}
            db.developer_profiles.update_one(
                {"user_id": uid, "platform": platform},
                {"$set": {"status": "error", "error_message": str(e)}},
            )
    return results


@router.get("/summary")
def developer_summary(uid: str = Depends(current_user_id)):
    profiles = list(db.developer_profiles.find({"user_id": uid}))
    mapped = {d["platform"]: d.get("stats", {}) for d in profiles}

    github_stats = mapped.get("github", {})
    leetcode_stats = mapped.get("leetcode", {})
    codeforces_stats = mapped.get("codeforces", {})
    codechef_stats = mapped.get("codechef", {})

    total_solved = (
        leetcode_stats.get("total_solved", 0)
        + codeforces_stats.get("total_solved", 0)
        + codechef_stats.get("problems_solved", 0)
    )

    external_activities_count = db.external_activities.count_documents({"user_id": uid})

    return {
        "connected_count": len([p for p in profiles if p.get("status") == "connected"]),
        "total_solved": total_solved,
        "leetcode_solved": leetcode_stats.get("total_solved", 0),
        "codeforces_rating": codeforces_stats.get("rating", 0),
        "codeforces_rank": codeforces_stats.get("rank", "Unrated"),
        "codechef_rating": codechef_stats.get("rating", 0),
        "codechef_stars": codechef_stats.get("stars", "—"),
        "github_repos": github_stats.get("public_repos", 0),
        "github_followers": github_stats.get("followers", 0),
        "total_external_activities": external_activities_count,
    }
