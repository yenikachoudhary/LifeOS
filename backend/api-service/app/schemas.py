from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from .utils import DATE_RE, to_date


def _valid_date(v: str) -> str:
    to_date(v)
    return v


IsoDate = Annotated[str, Field(pattern=DATE_RE), AfterValidator(_valid_date)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Priority = Literal["Low", "Medium", "High"]
Recurrence = Literal["none", "daily", "weekly"]


def _valid_url(v: Optional[str]) -> Optional[str]:
    if v in (None, ""):
        return None
    if not (v.startswith("http://") or v.startswith("https://")) or len(v) > 500:
        raise ValueError("URL must start with http:// or https://")
    return v


OptionalUrl = Annotated[Optional[str], AfterValidator(_valid_url)]


class TaskIn(BaseModel):
    title: Title
    priority: Priority = "Medium"
    deadline: Optional[IsoDate] = None
    recurrence: Recurrence = "none"
    start_date: IsoDate


class TaskUpdate(BaseModel):
    title: Optional[Title] = None
    priority: Optional[Priority] = None
    deadline: Optional[IsoDate] = None
    recurrence: Optional[Recurrence] = None
    start_date: Optional[IsoDate] = None


class CompletionIn(BaseModel):
    completed: bool


class HabitIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class FocusIn(BaseModel):
    date: IsoDate
    minutes: int = Field(ge=1, le=180)


class DsaIn(BaseModel):
    date: IsoDate
    title: Title
    difficulty: Literal["Easy", "Medium", "Hard"]
    url: OptionalUrl = None


class GitIn(BaseModel):
    date: IsoDate
    project: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    kind: Literal["push", "session"]
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] = ""
    repo_url: OptionalUrl = None


class SettingsIn(BaseModel):
    dsa_daily_goal: int = Field(ge=1, le=50)
    focus_daily_goal_minutes: int = Field(ge=5, le=720)


Platform = Literal["github", "leetcode", "codeforces", "codechef", "unstop"]


class DeveloperProfileIn(BaseModel):
    handle: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    profile_url: OptionalUrl = None


OpportunityCategory = Literal[
    "hackathon",
    "coding_competition",
    "innovation_challenge",
    "project_competition",
    "scholarship",
    "other",
]

OpportunityStatus = Literal[
    "discovered",
    "interested",
    "registered",
    "submitted",
    "shortlisted",
    "won",
    "lost",
    "expired",
]


class OpportunityIn(BaseModel):
    name: Title
    organizer: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    category: OpportunityCategory = "hackathon"
    description: Optional[str] = None
    url: OptionalUrl = None
    registration_deadline: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    eligibility: Optional[str] = None
    prize: Optional[str] = None
    source: Literal["unstop", "email", "direct"] = "direct"
    status: OpportunityStatus = "discovered"


class OpportunityUpdate(BaseModel):
    name: Optional[Title] = None
    organizer: Optional[str] = None
    category: Optional[OpportunityCategory] = None
    description: Optional[str] = None
    url: OptionalUrl = None
    registration_deadline: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    eligibility: Optional[str] = None
    prize: Optional[str] = None
    status: Optional[OpportunityStatus] = None


class ReminderIn(BaseModel):
    target_type: Literal["contest", "opportunity"]
    target_id: str
    title: Title
    event_time: str
    interval: Literal["1_week", "3_days", "1_day", "1_hour"] = "1_day"


class EmailSyncIn(BaseModel):
    raw_content: Optional[str] = None
    sample_type: Optional[str] = None

