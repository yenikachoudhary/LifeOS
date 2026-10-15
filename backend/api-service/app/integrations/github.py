from datetime import datetime, timezone
import hashlib
import hmac
from typing import Any, Optional
import httpx

from ..db import db


def _clean_handle(handle_or_url: str) -> str:
    handle = handle_or_url.strip().rstrip("/")
    if "github.com/" in handle:
        handle = handle.split("github.com/")[-1].split("/")[0]
    return handle


async def fetch_github_profile(handle_or_url: str, token: Optional[str] = None) -> dict[str, Any]:
    username = _clean_handle(handle_or_url)
    headers = {"User-Agent": "LifeOS-Platform", "Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"https://api.github.com/users/{username}", headers=headers)
        if resp.status_code == 404:
            raise ValueError(f"GitHub user '{username}' not found.")
        if resp.status_code != 200:
            raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
        data = resp.json()

    return {
        "handle": username,
        "name": data.get("name") or username,
        "avatar_url": data.get("avatar_url"),
        "profile_url": data.get("html_url") or f"https://github.com/{username}",
        "bio": data.get("bio") or "",
        "public_repos": data.get("public_repos", 0),
        "followers": data.get("followers", 0),
        "following": data.get("following", 0),
    }


async def sync_github_activity(user_id: str, handle_or_url: str, token: Optional[str] = None) -> dict[str, Any]:
    username = _clean_handle(handle_or_url)
    headers = {"User-Agent": "LifeOS-Platform", "Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    profile = await fetch_github_profile(username, token=token)

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(f"https://api.github.com/users/{username}/events/public", headers=headers)
        if resp.status_code != 200:
            events = []
        else:
            events = resp.json()

    new_events_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    if isinstance(events, list):
        for ev in events:
            ev_id = str(ev.get("id"))
            ev_type = ev.get("type", "UnknownEvent")
            created_at = ev.get("created_at") or now_iso
            date_str = created_at[:10]  # YYYY-MM-DD
            repo_name = ev.get("repo", {}).get("name", "Unknown Repository")
            repo_url = f"https://github.com/{repo_name}"

            title = f"GitHub {ev_type.replace('Event', '')} on {repo_name}"
            desc = ""
            action_kind = "session"

            if ev_type == "PushEvent":
                action_kind = "push"
                payload = ev.get("payload", {})
                commits = payload.get("commits", [])
                commit_count = len(commits) or payload.get("size", 1)
                title = f"Pushed {commit_count} commit{'s' if commit_count != 1 else ''} to {repo_name}"
                if commits and "message" in commits[0]:
                    desc = commits[0]["message"]
            elif ev_type == "PullRequestEvent":
                pr = ev.get("payload", {}).get("pull_request", {})
                pr_title = pr.get("title", "")
                title = f"PR on {repo_name}: {pr_title}" if pr_title else f"Pull Request on {repo_name}"
            elif ev_type == "IssuesEvent":
                issue = ev.get("payload", {}).get("issue", {})
                title = f"Issue #{issue.get('number', '')} on {repo_name}: {issue.get('title', '')}"

            # Upsert into external_activities
            res = db.external_activities.update_one(
                {"user_id": user_id, "source": "github", "external_id": ev_id},
                {
                    "$setOnInsert": {
                        "user_id": user_id,
                        "source": "github",
                        "external_id": ev_id,
                        "type": ev_type,
                        "title": title,
                        "description": desc,
                        "url": repo_url,
                        "date": date_str,
                        "timestamp": created_at,
                        "metadata": {"repo": repo_name, "raw_type": ev_type},
                    }
                },
                upsert=True,
            )
            if res.upserted_id:
                new_events_count += 1

            # Also mirror pushes to local git_entries if not already present
            if action_kind == "push":
                db.git_entries.update_one(
                    {"user_id": user_id, "external_id": ev_id},
                    {
                        "$setOnInsert": {
                            "user_id": user_id,
                            "external_id": ev_id,
                            "date": date_str,
                            "project": repo_name,
                            "kind": "push",
                            "note": desc or f"GitHub push via event {ev_id}",
                            "repo_url": repo_url,
                        }
                    },
                    upsert=True,
                )

    # Update developer profile in database
    db.developer_profiles.update_one(
        {"user_id": user_id, "platform": "github"},
        {
            "$set": {
                "user_id": user_id,
                "platform": "github",
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


def verify_webhook_signature(payload_bytes: bytes, secret: str, signature_header: str) -> bool:
    if not signature_header or not secret:
        return False
    parts = signature_header.split("sha256=")
    if len(parts) != 2:
        return False
    expected_hash = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_hash, parts[1])
