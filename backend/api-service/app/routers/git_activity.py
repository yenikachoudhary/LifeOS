from collections import Counter
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..auth import current_user_id
from ..db import db
from ..schemas import GitIn
from ..utils import DATE_RE, current_streak, oid, ser, to_date

router = APIRouter(prefix="/git", tags=["git"])


@router.post("", status_code=201)
def add_entry(body: GitIn, uid: str = Depends(current_user_id)):
    doc = body.model_dump()
    # "manual" = typed in by the user. Reserved value "github" will mark verified activity later.
    doc.update(user_id=uid, source="manual", created_at=datetime.now(timezone.utc))
    doc["_id"] = db.git_entries.insert_one(doc).inserted_id
    return ser(doc)


@router.get("/recent")
def recent(limit: int = Query(40, ge=1, le=200), uid: str = Depends(current_user_id)):
    cursor = db.git_entries.find({"user_id": uid}).sort([("date", -1), ("created_at", -1)]).limit(limit)
    return [ser(d) for d in cursor]


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: str, uid: str = Depends(current_user_id)):
    res = db.git_entries.delete_one({"_id": oid(entry_id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return Response(status_code=204)


@router.get("/summary")
def summary(day: str = Query(..., alias="date", pattern=DATE_RE), uid: str = Depends(current_user_id)):
    today = to_date(day)
    entries = list(db.git_entries.find({"user_id": uid}, {"date": 1, "project": 1, "kind": 1}))
    per_day = Counter(e["date"] for e in entries)
    last_14 = [
        {"date": (today - timedelta(days=i)).isoformat(), "count": per_day.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(13, -1, -1)
    ]
    return {
        "today": per_day.get(day, 0),
        "total": len(entries),
        "pushes": sum(1 for e in entries if e["kind"] == "push"),
        "sessions": sum(1 for e in entries if e["kind"] == "session"),
        "projects": [{"project": p, "count": c} for p, c in Counter(e["project"] for e in entries).most_common(8)],
        "last_14_days": last_14,
        "streak": current_streak({date.fromisoformat(d) for d in per_day}, today),
    }
