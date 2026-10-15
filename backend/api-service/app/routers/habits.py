from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response

from ..auth import current_user_id
from ..db import db
from ..schemas import CompletionIn, HabitIn
from ..utils import DATE_RE, best_streak, current_streak, oid, ser, to_date

router = APIRouter(prefix="/habits", tags=["habits"])


def habits_for_date(uid: str, day_str: str) -> list[dict]:
    day = to_date(day_str)
    checks: dict[str, set[date]] = defaultdict(set)
    for c in db.habit_checks.find({"user_id": uid}):
        checks[c["habit_id"]].add(date.fromisoformat(c["date"]))
    cutoff = day - timedelta(days=89)
    out = []
    for h in db.habits.find({"user_id": uid}).sort("created_at", 1):
        hid = str(h["_id"])
        dates = checks[hid]
        item = ser(h)
        item.update(
            checked=day in dates,
            current_streak=current_streak(dates, day),
            best_streak=best_streak(dates),
            history=sorted(d.isoformat() for d in dates if cutoff <= d <= day),
        )
        out.append(item)
    return out


@router.get("")
def list_habits(day: str = Query(..., alias="date", pattern=DATE_RE), uid: str = Depends(current_user_id)):
    return habits_for_date(uid, day)


@router.post("", status_code=201)
def create_habit(body: HabitIn, uid: str = Depends(current_user_id)):
    doc = {"user_id": uid, "name": body.name, "created_at": datetime.now(timezone.utc)}
    doc["_id"] = db.habits.insert_one(doc).inserted_id
    return ser(doc)


@router.patch("/{habit_id}")
def rename_habit(habit_id: str, body: HabitIn, uid: str = Depends(current_user_id)):
    res = db.habits.update_one({"_id": oid(habit_id), "user_id": uid}, {"$set": {"name": body.name}})
    if res.matched_count == 0:
        raise HTTPException(404, "Habit not found")
    return ser(db.habits.find_one({"_id": oid(habit_id), "user_id": uid}))


@router.delete("/{habit_id}", status_code=204)
def delete_habit(habit_id: str, uid: str = Depends(current_user_id)):
    res = db.habits.delete_one({"_id": oid(habit_id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Habit not found")
    db.habit_checks.delete_many({"user_id": uid, "habit_id": habit_id})
    return Response(status_code=204)


@router.put("/{habit_id}/check/{day}")
def set_check(
    habit_id: str,
    body: CompletionIn,
    day: str = Path(..., pattern=DATE_RE),
    uid: str = Depends(current_user_id),
):
    to_date(day)
    if not db.habits.find_one({"_id": oid(habit_id), "user_id": uid}):
        raise HTTPException(404, "Habit not found")
    key = {"user_id": uid, "habit_id": habit_id, "date": day}
    if body.completed:
        db.habit_checks.update_one(
            key, {"$setOnInsert": {"checked_at": datetime.now(timezone.utc)}}, upsert=True
        )
    else:
        db.habit_checks.delete_one(key)
    return {"habit_id": habit_id, "date": day, "checked": body.completed}
