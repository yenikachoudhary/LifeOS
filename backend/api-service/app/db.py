from pymongo import ASCENDING, DESCENDING, MongoClient

from .config import DB_NAME, MONGODB_URI

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]


def ensure_indexes() -> None:
    db.tasks.create_index([("user_id", ASCENDING)])
    db.task_completions.create_index(
        [("user_id", ASCENDING), ("task_id", ASCENDING), ("date", ASCENDING)], unique=True
    )
    db.task_completions.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
    db.habits.create_index([("user_id", ASCENDING)])
    db.habit_checks.create_index(
        [("user_id", ASCENDING), ("habit_id", ASCENDING), ("date", ASCENDING)], unique=True
    )
    db.habit_checks.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
    for name in ("focus_sessions", "dsa_entries", "git_entries"):
        db[name].create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.settings.create_index([("user_id", ASCENDING)], unique=True)
    db.developer_profiles.create_index([("user_id", ASCENDING), ("platform", ASCENDING)], unique=True)
    db.external_activities.create_index(
        [("user_id", ASCENDING), ("source", ASCENDING), ("external_id", ASCENDING)], unique=True
    )
    db.external_activities.create_index([("user_id", ASCENDING), ("date", DESCENDING)])
    db.external_activities.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
    db.opportunities.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.reminders.create_index([("user_id", ASCENDING), ("event_time", ASCENDING)])
    db.email_notifications.create_index([("user_id", ASCENDING), ("received_at", DESCENDING)])
