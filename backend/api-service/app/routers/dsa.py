from collections import Counter
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..auth import current_user_id
from ..db import db
from ..schemas import DsaIn
from ..utils import DATE_RE, current_streak, oid, ser, to_date
from .settings import get_settings

router = APIRouter(prefix="/dsa", tags=["leetcode"])


def solved_on(uid: str, day: str) -> int:
    return db.dsa_entries.count_documents({"user_id": uid, "date": day})


@router.post("", status_code=201)
def add_entry(body: DsaIn, uid: str = Depends(current_user_id)):
    doc = body.model_dump()
    doc.update(user_id=uid, source="manual", created_at=datetime.now(timezone.utc))
    doc["_id"] = db.dsa_entries.insert_one(doc).inserted_id
    return ser(doc)


@router.get("/recent")
def recent(limit: int = Query(30, ge=1, le=200), uid: str = Depends(current_user_id)):
    cursor = db.dsa_entries.find({"user_id": uid}).sort([("date", -1), ("created_at", -1)]).limit(limit)
    return [ser(d) for d in cursor]


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: str, uid: str = Depends(current_user_id)):
    res = db.dsa_entries.delete_one({"_id": oid(entry_id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return Response(status_code=204)


@router.get("/summary")
def summary(day: str = Query(..., alias="date", pattern=DATE_RE), uid: str = Depends(current_user_id)):
    today = to_date(day)
    entries = list(db.dsa_entries.find({"user_id": uid}, {"date": 1, "difficulty": 1}))
    per_day = Counter(e["date"] for e in entries)
    last_14 = [
        {"date": (today - timedelta(days=i)).isoformat(), "count": per_day.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(13, -1, -1)
    ]
    active_dates = {date.fromisoformat(d) for d in per_day}
    return {
        "today": per_day.get(day, 0),
        "goal": get_settings(uid)["dsa_daily_goal"],
        "total": len(entries),
        "by_difficulty": {k: Counter(e["difficulty"] for e in entries).get(k, 0) for k in ("Easy", "Medium", "Hard")},
        "last_14_days": last_14,
        "streak": current_streak(active_dates, today),
    }
