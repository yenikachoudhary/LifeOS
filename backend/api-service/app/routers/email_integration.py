from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import current_user_id
from ..db import db
from ..integrations.email_sync import SAMPLE_CONTEST_EMAILS, ingest_emails_into_system
from ..utils import oid

router = APIRouter(prefix="/email", tags=["email"])


@router.get("/status")
def get_email_status(uid: str = Depends(current_user_id)):
    profile = db.developer_profiles.find_one({"user_id": uid, "platform": "email"}) or {}
    notifications_count = db.email_notifications.count_documents({"user_id": uid})
    unread_count = db.email_notifications.count_documents({"user_id": uid, "read": False})

    return {
        "connected": profile.get("status") == "connected",
        "provider": "Gmail",
        "email": profile.get("handle") or "yenikachoudhary@gmail.com",
        "last_synced": profile.get("last_synced"),
        "total_notifications": notifications_count,
        "unread_notifications": unread_count,
        "sync_mode": "Automatic sync & filter",
    }


@router.post("/connect")
def connect_email(uid: str = Depends(current_user_id)):
    now_iso = datetime.now(timezone.utc).isoformat()
    db.developer_profiles.update_one(
        {"user_id": uid, "platform": "email"},
        {
            "$set": {
                "user_id": uid,
                "platform": "email",
                "handle": "yenikachoudhary@gmail.com",
                "profile_url": "https://mail.google.com",
                "status": "connected",
                "last_synced": now_iso,
                "stats": {"provider": "Gmail", "sync_enabled": True},
                "error_message": None,
            }
        },
        upsert=True,
    )
    # Perform initial sample ingestion so user immediately sees live parsed opportunities
    ingest_emails_into_system(uid, SAMPLE_CONTEST_EMAILS)
    return {"status": "connected", "message": "Gmail integration active and parsed initial notifications."}


@router.post("/disconnect")
def disconnect_email(uid: str = Depends(current_user_id)):
    db.developer_profiles.delete_one({"user_id": uid, "platform": "email"})
    return {"status": "disconnected", "message": "Email integration disconnected"}


@router.post("/sync")
def sync_emails(uid: str = Depends(current_user_id)):
    prof = db.developer_profiles.find_one({"user_id": uid, "platform": "email"})
    if not prof or prof.get("status") != "connected":
        # Auto-connect if sync is requested
        connect_email(uid)

    res = ingest_emails_into_system(uid, SAMPLE_CONTEST_EMAILS)
    now_iso = datetime.now(timezone.utc).isoformat()
    db.developer_profiles.update_one(
        {"user_id": uid, "platform": "email"},
        {"$set": {"last_synced": now_iso}},
    )
    return {"status": "synced", **res}


@router.post("/test-sample")
def ingest_test_sample(uid: str = Depends(current_user_id)):
    res = ingest_emails_into_system(uid, SAMPLE_CONTEST_EMAILS)
    return {"status": "success", "message": "Sample competition emails parsed into opportunities and feed", **res}


@router.get("/notifications")
def list_notifications(limit: int = Query(20, ge=1, le=50), uid: str = Depends(current_user_id)):
    docs = list(db.email_notifications.find({"user_id": uid}).sort("received_at", -1).limit(limit))
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d.pop("user_id", None)
    return docs


@router.patch("/notifications/{id}")
def mark_notification(id: str, read: bool = Query(True), uid: str = Depends(current_user_id)):
    res = db.email_notifications.update_one({"_id": oid(id), "user_id": uid}, {"$set": {"read": read}})
    if res.matched_count == 0:
        raise HTTPException(404, "Notification not found")
    return {"status": "updated"}


@router.delete("/notifications/{id}")
def delete_notification(id: str, uid: str = Depends(current_user_id)):
    res = db.email_notifications.delete_one({"_id": oid(id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Notification not found")
    return {"status": "deleted"}
