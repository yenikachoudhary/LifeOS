from datetime import date, timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

DATE_RE = r"^\d{4}-\d{2}-\d{2}$"


def to_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, "Invalid date, expected YYYY-MM-DD")


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(404, "Not found")


def ser(doc: dict) -> dict:
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    out.pop("user_id", None)
    return out


def current_streak(dates: set[date], today: date) -> int:
    """Consecutive days ending today (or yesterday if today is not done yet)."""
    d = today if today in dates else today - timedelta(days=1)
    n = 0
    while d in dates:
        n += 1
        d -= timedelta(days=1)
    return n


def best_streak(dates: set[date]) -> int:
    best = run = 0
    prev = None
    for d in sorted(dates):
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return best
