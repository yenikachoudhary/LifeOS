from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response

from ..auth import current_user_id
from ..db import db
from ..schemas import CompletionIn, TaskIn, TaskUpdate
from ..utils import DATE_RE, oid, ser, to_date

router = APIRouter(prefix="/tasks", tags=["tasks"])
PRIORITY_ORDER = {"High": 0, "Medium": 1, "Low": 2}


def is_due(task: dict, day: date) -> bool:
    """A task DEFINITION decides whether it has an occurrence on `day`."""
    start = date.fromisoformat(task["start_date"])
    if day < start:
        return False
    if task["recurrence"] == "daily":
        return True
    if task["recurrence"] == "weekly":
        return start.weekday() == day.weekday()
    return True  # one-time tasks carry over until completed


def tasks_for_date(user_id: str, day_str: str) -> list[dict]:
    """Returns today's OCCURRENCES: definition + completed flag for that date only."""
    day = to_date(day_str)
    definitions = list(db.tasks.find({"user_id": user_id}))
    one_time_ids = [str(t["_id"]) for t in definitions if t["recurrence"] == "none"]
    done_today = {
        c["task_id"] for c in db.task_completions.find({"user_id": user_id, "date": day_str})
    }
    done_ever = {
        c["task_id"]
        for c in db.task_completions.find({"user_id": user_id, "task_id": {"$in": one_time_ids}})
    }
    result = []
    for t in definitions:
        tid = str(t["_id"])
        if not is_due(t, day):
            continue
        completed = tid in done_today
        if t["recurrence"] == "none" and tid in done_ever and not completed:
            continue  # finished on an earlier day
        item = ser(t)
        item["completed"] = completed
        item["overdue"] = bool(t.get("deadline") and t["deadline"] < day_str and not completed)
        result.append(item)
    result.sort(
        key=lambda x: (
            x["completed"],
            PRIORITY_ORDER[x["priority"]],
            x.get("deadline") or "9999-99-99",
            x["created_at"],
        )
    )
    return result


@router.get("")
def list_tasks(day: str = Query(..., alias="date", pattern=DATE_RE), uid: str = Depends(current_user_id)):
    return tasks_for_date(uid, day)


@router.post("", status_code=201)
def create_task(body: TaskIn, uid: str = Depends(current_user_id)):
    doc = body.model_dump()
    doc.update(user_id=uid, created_at=datetime.now(timezone.utc))
    doc["_id"] = db.tasks.insert_one(doc).inserted_id
    return ser(doc)


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, uid: str = Depends(current_user_id)):
    changes = body.model_dump(exclude_unset=True)
    for key in ("title", "priority", "recurrence", "start_date"):
        if key in changes and changes[key] is None:
            del changes[key]
    if changes:
        res = db.tasks.update_one({"_id": oid(task_id), "user_id": uid}, {"$set": changes})
        if res.matched_count == 0:
            raise HTTPException(404, "Task not found")
    doc = db.tasks.find_one({"_id": oid(task_id), "user_id": uid})
    if not doc:
        raise HTTPException(404, "Task not found")
    return ser(doc)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, uid: str = Depends(current_user_id)):
    res = db.tasks.delete_one({"_id": oid(task_id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Task not found")
    db.task_completions.delete_many({"user_id": uid, "task_id": task_id})
    return Response(status_code=204)


@router.put("/{task_id}/completion/{day}")
def set_completion(
    task_id: str,
    body: CompletionIn,
    day: str = Path(..., pattern=DATE_RE),
    uid: str = Depends(current_user_id),
):
    """Marks ONE occurrence (task + date) done or not done. Other dates are untouched."""
    task = db.tasks.find_one({"_id": oid(task_id), "user_id": uid})
    if not task:
        raise HTTPException(404, "Task not found")
    if not is_due(task, to_date(day)):
        raise HTTPException(400, "This task has no occurrence on that date")
    key = {"user_id": uid, "task_id": task_id, "date": day}
    if body.completed:
        if task["recurrence"] == "none":
            db.task_completions.delete_many({"user_id": uid, "task_id": task_id})
        db.task_completions.update_one(
            key, {"$setOnInsert": {"completed_at": datetime.now(timezone.utc)}}, upsert=True
        )
    else:
        db.task_completions.delete_one(key)
    return {"task_id": task_id, "date": day, "completed": body.completed}
