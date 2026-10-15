from typing import Optional
from fastapi import APIRouter, Depends, Query

from ..auth import current_user_id
from ..db import db

router = APIRouter(prefix="/feed", tags=["feed"])

SOURCE_ICONS = {
    "github": "🐙",
    "leetcode": "🧩",
    "codeforces": "🏆",
    "codechef": "⭐",
    "unstop": "🚀",
    "email": "✉️",
    "tasks": "✅",
    "habits": "🌱",
    "focus": "⏱️",
}


@router.get("")
def get_unified_feed(
    platform: Optional[str] = Query(None),
    kind: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    page: int = Query(1, ge=1),
    uid: str = Depends(current_user_id),
):
    query = {"user_id": uid}
    if platform and platform != "all":
        query["source"] = platform
    if kind and kind != "all":
        query["type"] = kind

    total = db.external_activities.count_documents(query)
    skip = (page - 1) * limit
    cursor = (
        db.external_activities.find(query)
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
    )

    items = []
    for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        doc.pop("user_id", None)
        src = doc.get("source", "other")
        doc["icon"] = SOURCE_ICONS.get(src, "📌")
        items.append(doc)

    # Calculate summary counts per source
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
    ]
    source_counts = {row["_id"]: row["count"] for row in db.external_activities.aggregate(pipeline)}

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "source_counts": source_counts,
    }
