from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import current_user_id
from ..db import db
from ..utils import DATE_RE, current_streak, to_date

router = APIRouter(prefix="/activity", tags=["activity"])

ALL_CATEGORIES = [
    "tasks",
    "habits",
    "focus",
    "dsa",
    "git",
    "codeforces",
    "codechef",
    "competitions",
]


def activity_by_date(uid: str, start: str, end: str, category: Optional[str] = None) -> dict[str, dict]:
    days: dict[str, dict] = {}

    def get_day(d_str: str) -> dict:
        return days.setdefault(d_str, {k: 0 for k in ALL_CATEGORIES} | {"total": 0})

    # 1. Local collections
    local_sources = {
        "tasks": "task_completions",
        "habits": "habit_checks",
        "focus": "focus_sessions",
    }
    for key, coll in local_sources.items():
        if category and category != "all" and category != key:
            continue
        pipeline = [
            {"$match": {"user_id": uid, "date": {"$gte": start, "$lte": end}}},
            {"$group": {"_id": "$date", "n": {"$sum": 1}}},
        ]
        for row in db[coll].aggregate(pipeline):
            get_day(row["_id"])[key] += row["n"]

    # 2. Local dsa and git entries without external_id (to avoid double-counting)
    if not category or category == "all" or category == "dsa":
        pipeline_dsa = [
            {"$match": {"user_id": uid, "date": {"$gte": start, "$lte": end}, "external_id": {"$exists": False}}},
            {"$group": {"_id": "$date", "n": {"$sum": 1}}},
        ]
        for row in db.dsa_entries.aggregate(pipeline_dsa):
            get_day(row["_id"])["dsa"] += row["n"]

    if not category or category == "all" or category == "git":
        pipeline_git = [
            {"$match": {"user_id": uid, "date": {"$gte": start, "$lte": end}, "external_id": {"$exists": False}}},
            {"$group": {"_id": "$date", "n": {"$sum": 1}}},
        ]
        for row in db.git_entries.aggregate(pipeline_git):
            get_day(row["_id"])["git"] += row["n"]

    # 3. External activities
    pipeline_ext = [
        {"$match": {"user_id": uid, "date": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": {"date": "$date", "source": "$source"}, "n": {"$sum": 1}}},
    ]
    for row in db.external_activities.aggregate(pipeline_ext):
        d_str = row["_id"]["date"]
        src = row["_id"]["source"]
        cnt = row["n"]
        d = get_day(d_str)

        if src == "github" and (not category or category in ("all", "git")):
            d["git"] += cnt
        elif src == "leetcode" and (not category or category in ("all", "dsa")):
            d["dsa"] += cnt
        elif src == "codeforces" and (not category or category in ("all", "codeforces")):
            d["codeforces"] += cnt
        elif src == "codechef" and (not category or category in ("all", "codechef")):
            d["codechef"] += cnt
        elif src in ("unstop", "email") and (not category or category in ("all", "competitions")):
            d["competitions"] += cnt

    # Compute total for each day
    for d in days.values():
        if category and category != "all":
            d["total"] = d.get(category, 0)
        else:
            d["total"] = sum(d[k] for k in ALL_CATEGORIES)

    return days


def active_streak(uid: str, today: date) -> int:
    start = (today - timedelta(days=400)).isoformat()
    days = activity_by_date(uid, start, today.isoformat())
    return current_streak({date.fromisoformat(k) for k, v in days.items() if v["total"] > 0}, today)


@router.get("")
def activity(
    start: str = Query(..., pattern=DATE_RE),
    end: str = Query(..., pattern=DATE_RE),
    category: Optional[str] = Query(None),
    uid: str = Depends(current_user_id),
):
    s, e = to_date(start), to_date(end)
    if e < s or (e - s).days > 800:
        raise HTTPException(422, "Invalid date range (max about two years)")
    return activity_by_date(uid, start, end, category=category)


@router.get("/streak")
def streak(today: str = Query(..., pattern=DATE_RE), uid: str = Depends(current_user_id)):
    return {"streak": active_streak(uid, to_date(today))}
