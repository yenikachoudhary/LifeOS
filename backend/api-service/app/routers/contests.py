from typing import Optional
from fastapi import APIRouter, Depends, Query

from ..auth import current_user_id
from ..db import db
from ..integrations.contests import get_all_upcoming_contests
from ..schemas import ReminderIn

router = APIRouter(prefix="/contests", tags=["contests"])


@router.get("")
async def list_contests(
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    force_refresh: bool = Query(False),
    uid: str = Depends(current_user_id),
):
    contests = await get_all_upcoming_contests(force_refresh=force_refresh)

    # Fetch user's active reminders for contests
    user_reminders = {
        r["target_id"]: r["interval"]
        for r in db.reminders.find({"user_id": uid, "target_type": "contest", "dismissed": False})
    }

    results = []
    for c in contests:
        if platform and platform.lower() != "all" and c["platform"].lower() != platform.lower():
            continue
        if status and status.lower() != "all" and c["status"].lower() != status.lower():
            continue

        item = dict(c)
        item["has_reminder"] = c["id"] in user_reminders
        item["reminder_interval"] = user_reminders.get(c["id"])
        results.append(item)

    return {
        "contests": results,
        "total": len(results),
        "platforms": ["All", "Codeforces", "LeetCode", "CodeChef"],
    }


@router.post("/remind")
def toggle_contest_reminder(body: ReminderIn, uid: str = Depends(current_user_id)):
    existing = db.reminders.find_one({
        "user_id": uid,
        "target_type": "contest",
        "target_id": body.target_id,
        "dismissed": False,
    })

    if existing:
        db.reminders.delete_one({"_id": existing["_id"]})
        return {"reminded": False, "message": "Reminder removed"}
    else:
        db.reminders.insert_one({
            "user_id": uid,
            "target_type": "contest",
            "target_id": body.target_id,
            "title": body.title,
            "event_time": body.event_time,
            "interval": body.interval,
            "dismissed": False,
        })
        return {"reminded": True, "message": f"Reminder set for {body.interval.replace('_', ' ')} before"}
