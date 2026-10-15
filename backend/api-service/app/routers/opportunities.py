from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import current_user_id
from ..db import db
from ..schemas import OpportunityIn, OpportunityUpdate
from ..utils import oid

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.get("")
def list_opportunities(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    uid: str = Depends(current_user_id),
):
    query = {"user_id": uid}
    if category and category != "all":
        query["category"] = category
    if status and status != "all":
        query["status"] = status
    if source and source != "all":
        query["source"] = source

    docs = list(db.opportunities.find(query).sort("created_at", -1))
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d.pop("user_id", None)

    # Category and status aggregations
    pipeline_cat = [
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    ]
    pipeline_status = [
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    cat_counts = {row["_id"]: row["count"] for row in db.opportunities.aggregate(pipeline_cat)}
    status_counts = {row["_id"]: row["count"] for row in db.opportunities.aggregate(pipeline_status)}

    return {
        "opportunities": docs,
        "total": len(docs),
        "category_counts": cat_counts,
        "status_counts": status_counts,
    }


@router.post("")
def create_opportunity(body: OpportunityIn, uid: str = Depends(current_user_id)):
    now_iso = datetime.now(timezone.utc).isoformat()
    data = body.model_dump()
    data["user_id"] = uid
    data["created_at"] = now_iso
    data["updated_at"] = now_iso

    res = db.opportunities.insert_one(data)
    data["id"] = str(res.inserted_id)
    data.pop("_id", None)
    data.pop("user_id", None)
    return data


@router.patch("/{id}")
def update_opportunity(id: str, body: OpportunityUpdate, uid: str = Depends(current_user_id)):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(400, "No fields to update")

    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = db.opportunities.update_one({"_id": oid(id), "user_id": uid}, {"$set": fields})
    if res.matched_count == 0:
        raise HTTPException(404, "Opportunity not found")

    doc = db.opportunities.find_one({"_id": oid(id)})
    doc["id"] = str(doc.pop("_id"))
    doc.pop("user_id", None)
    return doc


@router.delete("/{id}")
def delete_opportunity(id: str, uid: str = Depends(current_user_id)):
    res = db.opportunities.delete_one({"_id": oid(id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Opportunity not found")
    return {"message": "Opportunity deleted"}
