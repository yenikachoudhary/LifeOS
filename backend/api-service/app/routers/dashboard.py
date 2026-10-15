from datetime import timedelta

from fastapi import APIRouter, Depends, Query

from ..auth import current_user_id
from ..db import db
from ..utils import DATE_RE, to_date
from .activity import active_streak, activity_by_date
from .dsa import solved_on
from .focus import focus_minutes
from .habits import habits_for_date
from .settings import get_settings
from .tasks import tasks_for_date

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(day: str = Query(..., alias="date", pattern=DATE_RE), uid: str = Depends(current_user_id)):
    today = to_date(day)
    settings = get_settings(uid)
    tasks = tasks_for_date(uid, day)
    habits = habits_for_date(uid, day)
    year = activity_by_date(uid, (today - timedelta(days=364)).isoformat(), day)
    return {
        "tasks": {
            "done": sum(1 for t in tasks if t["completed"]),
            "total": len(tasks),
            "priorities": [t for t in tasks if not t["completed"]][:3],
        },
        "focus": {"minutes": focus_minutes(uid, day), "goal": settings["focus_daily_goal_minutes"]},
        "dsa": {"solved": solved_on(uid, day), "goal": settings["dsa_daily_goal"]},
        "habits": {
            "done": sum(1 for h in habits if h["checked"]),
            "total": len(habits),
            "best_current_streak": max((h["current_streak"] for h in habits), default=0),
        },
        "git_today": db.git_entries.count_documents({"user_id": uid, "date": day}),
        "active_days_year": sum(1 for v in year.values() if v["total"] > 0),
        "streak": active_streak(uid, today),
    }
