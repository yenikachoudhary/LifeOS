from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import current_user_id
from ..db import db
from ..schemas import ReminderIn
from ..utils import oid

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("")
def list_reminders(include_dismissed: bool = Query(False), uid: str = Depends(current_user_id)):
    query = {"user_id": uid}
    if not include_dismissed:
        query["dismissed"] = False

    docs = list(db.reminders.find(query).sort("event_time", 1))
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d.pop("user_id", None)
    return docs


@router.post("")
def add_reminder(body: ReminderIn, uid: str = Depends(current_user_id)):
    data = body.model_dump()
    data["user_id"] = uid
    data["dismissed"] = False

    res = db.reminders.insert_one(data)
    data["id"] = str(res.inserted_id)
    data.pop("_id", None)
    data.pop("user_id", None)
    return data


@router.post("/{id}/dismiss")
def dismiss_reminder(id: str, uid: str = Depends(current_user_id)):
    res = db.reminders.update_one({"_id": oid(id), "user_id": uid}, {"$set": {"dismissed": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Reminder not found")
    return {"status": "dismissed"}


@router.delete("/{id}")
def delete_reminder(id: str, uid: str = Depends(current_user_id)):
    res = db.reminders.delete_one({"_id": oid(id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Reminder not found")
    return {"status": "deleted"}
