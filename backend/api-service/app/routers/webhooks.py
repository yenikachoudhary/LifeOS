from datetime import datetime, timezone
import json
from fastapi import APIRouter, Header, HTTPException, Request

from ..config import JWT_SECRET
from ..db import db
from ..integrations.github import verify_webhook_signature

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/github/{uid}")
async def github_webhook(
    uid: str,
    request: Request,
    x_github_event: str = Header(None),
    x_hub_signature_256: str = Header(None),
):
    body_bytes = await request.body()

    # Verify signature if secret provided (using JWT_SECRET or custom user secret)
    if x_hub_signature_256:
        is_valid = verify_webhook_signature(body_bytes, JWT_SECRET, x_hub_signature_256)
        if not is_valid:
            raise HTTPException(401, "Invalid webhook signature")

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    event_type = x_github_event or "push"
    now_iso = datetime.now(timezone.utc).isoformat()
    today_str = now_iso[:10]

    repo = payload.get("repository", {})
    repo_name = repo.get("full_name") or repo.get("name", "Unknown Repo")
    repo_url = repo.get("html_url", f"https://github.com/{repo_name}")

    if event_type == "push":
        commits = payload.get("commits", [])
        commit_count = len(commits) or 1
        head_commit = payload.get("head_commit") or (commits[0] if commits else {})
        msg = head_commit.get("message", "GitHub push event")
        ev_id = str(payload.get("after") or head_commit.get("id") or now_iso)

        # External activity entry
        db.external_activities.update_one(
            {"user_id": uid, "source": "github", "external_id": f"webhook_{ev_id}"},
            {
                "$setOnInsert": {
                    "user_id": uid,
                    "source": "github",
                    "external_id": f"webhook_{ev_id}",
                    "type": "push",
                    "title": f"Pushed {commit_count} commit{'s' if commit_count != 1 else ''} to {repo_name}",
                    "description": msg,
                    "url": head_commit.get("url") or repo_url,
                    "date": today_str,
                    "timestamp": now_iso,
                    "metadata": {"repo": repo_name, "commits": commit_count},
                }
            },
            upsert=True,
        )

        # Git entries reflection
        db.git_entries.update_one(
            {"user_id": uid, "external_id": f"webhook_{ev_id}"},
            {
                "$setOnInsert": {
                    "user_id": uid,
                    "external_id": f"webhook_{ev_id}",
                    "date": today_str,
                    "project": repo_name,
                    "kind": "push",
                    "note": f"Verified Webhook: {msg}",
                    "repo_url": repo_url,
                }
            },
            upsert=True,
        )

    elif event_type == "pull_request":
        pr = payload.get("pull_request", {})
        action = payload.get("action", "opened")
        pr_id = str(pr.get("id") or now_iso)
        pr_title = pr.get("title", "")
        pr_url = pr.get("html_url", repo_url)

        db.external_activities.update_one(
            {"user_id": uid, "source": "github", "external_id": f"webhook_pr_{pr_id}"},
            {
                "$setOnInsert": {
                    "user_id": uid,
                    "source": "github",
                    "external_id": f"webhook_pr_{pr_id}",
                    "type": "pull_request",
                    "title": f"PR {action}: {pr_title} ({repo_name})",
                    "description": pr.get("body", "")[:200],
                    "url": pr_url,
                    "date": today_str,
                    "timestamp": now_iso,
                    "metadata": {"action": action, "repo": repo_name},
                }
            },
            upsert=True,
        )

    return {"status": "ok", "event": event_type, "repo": repo_name}
