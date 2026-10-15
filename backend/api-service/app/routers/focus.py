from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from ..auth import current_user_id
from ..db import db
from ..schemas import FocusIn
from ..utils import DATE_RE, ser, to_date

router = APIRouter(prefix="/focus", tags=["focus"])


def focus_minutes(uid: str, day: str) -> int:
    rows = db.focus_sessions.aggregate(
        [{"$match": {"user_id": uid, "date": day}}, {"$group": {"_id": None, "m": {"$sum": "$minutes"}}}]
    )
    return next(iter(rows), {}).get("m", 0)


@router.post("", status_code=201)
def record_session(body: FocusIn, uid: str = Depends(current_user_id)):
    doc = {"user_id": uid, "date": body.date, "minutes": body.minutes, "completed_at": datetime.now(timezone.utc)}
    doc["_id"] = db.focus_sessions.insert_one(doc).inserted_id
    return ser(doc)


@router.get("")
def day_summary(day: str = Query(..., alias="date", pattern=DATE_RE), uid: str = Depends(current_user_id)):
    to_date(day)
    sessions = [ser(s) for s in db.focus_sessions.find({"user_id": uid, "date": day}).sort("completed_at", 1)]
    return {"date": day, "sessions": sessions, "total_minutes": sum(s["minutes"] for s in sessions)}


@router.get("/history")
def history(
    today: str = Query(..., pattern=DATE_RE),
    days: int = Query(7, ge=1, le=90),
    uid: str = Depends(current_user_id),
):
    end = to_date(today)
    start = end - timedelta(days=days - 1)
    rows = db.focus_sessions.aggregate(
        [
            {"$match": {"user_id": uid, "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}}},
            {"$group": {"_id": "$date", "minutes": {"$sum": "$minutes"}, "sessions": {"$sum": 1}}},
        ]
    )
    by_day = {r["_id"]: r for r in rows}
    out = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        out.append({"date": d, "minutes": by_day.get(d, {}).get("minutes", 0), "sessions": by_day.get(d, {}).get("sessions", 0)})
    return out
