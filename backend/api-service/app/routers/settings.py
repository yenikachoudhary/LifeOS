from fastapi import APIRouter, Depends

from ..auth import current_user_id
from ..db import db
from ..schemas import SettingsIn

router = APIRouter(prefix="/settings", tags=["settings"])
DEFAULTS = {"dsa_daily_goal": 1, "focus_daily_goal_minutes": 120}


def get_settings(uid: str) -> dict:
    doc = db.settings.find_one({"user_id": uid}) or {}
    return {k: doc.get(k, v) for k, v in DEFAULTS.items()}


@router.get("")
def read_settings(uid: str = Depends(current_user_id)):
    return get_settings(uid)


@router.put("")
def update_settings(body: SettingsIn, uid: str = Depends(current_user_id)):
    db.settings.update_one({"user_id": uid}, {"$set": body.model_dump()}, upsert=True)
    return get_settings(uid)
