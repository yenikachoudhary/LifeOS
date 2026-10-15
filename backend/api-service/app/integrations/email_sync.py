from datetime import datetime, timezone
import hashlib
import re
from typing import Any, Optional

from ..db import db


SAMPLE_CONTEST_EMAILS = [
    {
        "id": "msg_unstop_flipkart",
        "sender": "notifications@unstop.com",
        "subject": "Registration Open: Flipkart GRiD 7.0 Hackathon & Engineering Track",
        "date": "2026-10-15T04:30:00Z",
        "body": """
Hello Yenika,

Exciting news! Flipkart GRiD 7.0 has officially opened registrations.
Organizer: Flipkart India
Track: Autonomous Systems, Smart Commerce, Information Security
Deadline to apply: 2026-11-15
Prizes: Cash pool of ₹9,00,000 and direct interview opportunities.
Register here: https://unstop.com/competitions/flipkart-grid-70

Best of luck,
The Unstop Team
        """,
    },
    {
        "id": "msg_cf_round",
        "sender": "no-reply@codeforces.com",
        "subject": "Reminder: Codeforces Round (Div. 2) begins this weekend",
        "date": "2026-10-14T18:00:00Z",
        "body": """
Hello glitch_1207,

A new rated round is scheduled on Codeforces:
Round: Codeforces Round (Div. 2)
Organizer: Codeforces
Start Time: 2026-10-24 16:35:00 UTC
Duration: 2 hours
Registration link: https://codeforces.com/contestRegistration/1990

Happy coding!
        """,
    },
    {
        "id": "msg_unstop_smart_india",
        "sender": "announcements@unstop.com",
        "subject": "National Challenge: Smart India Hackathon 2026 Campus Edition",
        "date": "2026-10-13T10:15:00Z",
        "body": """
Hi Yenika,

The Campus Round for Smart India Hackathon 2026 is now live.
Organizer: Ministry of Education & AICTE
Category: Innovation Challenge / Software Track
Submission Deadline: 2026-11-30
Link: https://unstop.com/hackathons/smart-india-hackathon-2026

Form your team and submit your prototype idea!
        """,
    },
]


def parse_email_for_opportunity(email_obj: dict[str, Any]) -> Optional[dict[str, Any]]:
    subject = email_obj.get("subject", "")
    body = email_obj.get("body", "")
    full_text = f"{subject}\n{body}"

    # Extract URL
    url_m = re.search(r'https?://[^\s<>"]+', body)
    url = url_m.group(0) if url_m else None

    # Detect organizer
    organizer = "Competition Organizer"
    if "unstop" in full_text.lower():
        organizer = "Unstop"
    elif "codeforces" in full_text.lower():
        organizer = "Codeforces"
    elif "leetcode" in full_text.lower():
        organizer = "LeetCode"
    elif "codechef" in full_text.lower():
        organizer = "CodeChef"

    org_m = re.search(r'Organizer:\s*([^\n\r]+)', body, re.I)
    if org_m:
        organizer = org_m.group(1).strip()

    # Detect category
    category = "hackathon"
    lower_text = full_text.lower()
    if "hackathon" in lower_text:
        category = "hackathon"
    elif "quiz" in lower_text or "challenge" in lower_text:
        category = "innovation_challenge"
    elif "round" in lower_text or "contest" in lower_text:
        category = "coding_competition"
    elif "scholarship" in lower_text or "fellowship" in lower_text or "gsoc" in lower_text:
        category = "scholarship"

    # Detect deadline / date
    deadline = None
    deadline_m = re.search(r'(?:deadline|apply by|register by|start time):\s*([0-9]{4}-[0-9]{2}-[0-9]{2})', body, re.I)
    if deadline_m:
        deadline = deadline_m.group(1)

    # Detect prize
    prize = None
    prize_m = re.search(r'(?:prizes?|prize pool|cash pool|stipend):\s*([^\n\r]+)', body, re.I)
    if prize_m:
        prize = prize_m.group(1).strip()

    # Title extraction
    title = subject
    for prefix in ("Registration Open:", "Reminder:", "National Challenge:", "New Competition:"):
        if title.lower().startswith(prefix.lower()):
            title = title[len(prefix):].strip()

    return {
        "name": title[:120],
        "organizer": organizer[:80],
        "category": category,
        "description": body.strip()[:400],
        "url": url,
        "registration_deadline": deadline,
        "prize": prize,
        "source": "email",
        "status": "discovered",
    }


def ingest_emails_into_system(user_id: str, emails: list[dict[str, Any]]) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    new_emails_count = 0
    new_opps_count = 0

    for email_data in emails:
        msg_id = email_data.get("id") or hashlib.sha256(
            (email_data.get("subject", "") + email_data.get("date", "")).encode("utf-8")
        ).hexdigest()

        # Check if email is already saved
        existing = db.email_notifications.find_one({"user_id": user_id, "message_id": msg_id})
        if not existing:
            db.email_notifications.insert_one({
                "user_id": user_id,
                "message_id": msg_id,
                "sender": email_data.get("sender", "Unknown"),
                "subject": email_data.get("subject", "No subject"),
                "received_at": email_data.get("date") or now_iso,
                "body_preview": (email_data.get("body") or "")[:200],
                "read": False,
                "saved": True,
                "created_at": now_iso,
            })
            new_emails_count += 1

            # Parse into opportunity
            parsed_opp = parse_email_for_opportunity(email_data)
            if parsed_opp:
                parsed_opp["user_id"] = user_id
                parsed_opp["created_at"] = now_iso
                parsed_opp["updated_at"] = now_iso
                # Deduplicate by name and organizer
                db.opportunities.update_one(
                    {"user_id": user_id, "name": parsed_opp["name"], "organizer": parsed_opp["organizer"]},
                    {"$setOnInsert": parsed_opp},
                    upsert=True,
                )
                new_opps_count += 1

                # Also create an external_activity item for the feed
                db.external_activities.update_one(
                    {"user_id": user_id, "source": "email", "external_id": msg_id},
                    {
                        "$setOnInsert": {
                            "user_id": user_id,
                            "source": "email",
                            "external_id": msg_id,
                            "type": "opportunity_discovered",
                            "title": f"Opportunity: {parsed_opp['name']}",
                            "description": f"From {parsed_opp['organizer']} (via email)",
                            "url": parsed_opp.get("url"),
                            "date": now_iso[:10],
                            "timestamp": now_iso,
                            "metadata": parsed_opp,
                        }
                    },
                    upsert=True,
                )

    return {"emails_synced": new_emails_count, "opportunities_created": new_opps_count}
