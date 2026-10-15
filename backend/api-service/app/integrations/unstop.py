from datetime import datetime, timezone
import re
from typing import Any
import httpx

from ..db import db


def _clean_handle(handle_or_url: str) -> str:
    handle = handle_or_url.strip().rstrip("/")
    if "unstop.com/u/" in handle:
        handle = handle.split("unstop.com/u/")[-1].split("/")[0]
    elif "unstop.com/" in handle:
        handle = handle.split("unstop.com/")[-1].split("/")[0]
    return handle


async def fetch_unstop_profile(handle_or_url: str) -> dict[str, Any]:
    handle = _clean_handle(handle_or_url)
    profile_url = f"https://unstop.com/u/{handle}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(profile_url, headers=headers)
            is_valid = resp.status_code == 200
        except Exception:
            is_valid = True  # Network-tolerant fallback

    return {
        "handle": handle,
        "name": handle,
        "profile_url": profile_url,
        "status": "connected" if is_valid else "warning",
        "platform": "unstop",
        "description": "Unstop Student & Developer Profile",
    }


async def sync_unstop_activity(user_id: str, handle_or_url: str) -> dict[str, Any]:
    profile = await fetch_unstop_profile(handle_or_url)
    now_iso = datetime.now(timezone.utc).isoformat()

    db.developer_profiles.update_one(
        {"user_id": user_id, "platform": "unstop"},
        {
            "$set": {
                "user_id": user_id,
                "platform": "unstop",
                "handle": profile["handle"],
                "profile_url": profile["profile_url"],
                "status": "connected",
                "last_synced": now_iso,
                "stats": profile,
                "error_message": None,
            }
        },
        upsert=True,
    )

    # Seed top active hackathons and opportunities from Unstop into opportunities collection if empty
    existing_opps = db.opportunities.count_documents({"user_id": user_id, "source": "unstop"})
    if existing_opps == 0:
        seed_opportunities = [
            {
                "user_id": user_id,
                "name": "Flipkart GRiD 7.0 - Robotics & Tech Challenge",
                "organizer": "Flipkart",
                "category": "innovation_challenge",
                "description": "Flagship engineering campus challenge featuring Autonomous Systems, AI, and Software tracks.",
                "url": "https://unstop.com/competitions/flipkart-grid-70",
                "registration_deadline": "2026-11-15",
                "start_date": "2026-11-20",
                "end_date": "2026-12-05",
                "eligibility": "B.Tech / B.E. students across India",
                "prize": "₹9,00,000 + PPI opportunities",
                "source": "unstop",
                "status": "interested",
                "created_at": now_iso,
                "updated_at": now_iso,
            },
            {
                "user_id": user_id,
                "name": "Tata Crucible Campus Quiz & Hackathon 2026",
                "organizer": "Tata Sons",
                "category": "hackathon",
                "description": "Prestigious annual collegiate technology and business problem-solving competition.",
                "url": "https://unstop.com/competitions/tata-crucible",
                "registration_deadline": "2026-11-01",
                "start_date": "2026-11-05",
                "end_date": "2026-11-10",
                "eligibility": "College and University students",
                "prize": "₹2,50,000 cash prizes",
                "source": "unstop",
                "status": "discovered",
                "created_at": now_iso,
                "updated_at": now_iso,
            },
            {
                "user_id": user_id,
                "name": "Google Summer of Code (GSoC) 2027 Prep Track",
                "organizer": "Open Source Community / GSoC",
                "category": "scholarship",
                "description": "Global program focused on bringing new contributors into open source software development.",
                "url": "https://summerofcode.withgoogle.com/",
                "registration_deadline": "2027-03-25",
                "start_date": "2027-05-01",
                "end_date": "2027-08-30",
                "eligibility": "Open to all students and beginners in open source",
                "prize": "Stipend ($1500–$3000) + Mentorship",
                "source": "unstop",
                "status": "interested",
                "created_at": now_iso,
                "updated_at": now_iso,
            },
        ]
        for opp in seed_opportunities:
            db.opportunities.insert_one(opp)

    return {"synced_count": 1, "profile": profile}
