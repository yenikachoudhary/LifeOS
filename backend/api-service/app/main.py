from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .db import ensure_indexes
from .routers import (
    activity,
    contests,
    dashboard,
    developer,
    dsa,
    email_integration,
    feed,
    focus,
    git_activity,
    habits,
    opportunities,
    reminders,
    settings,
    tasks,
    webhooks,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()
    yield


app = FastAPI(title="LifeOS API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-GitHub-Event", "X-Hub-Signature-256"],
)

for module in (
    tasks,
    habits,
    focus,
    dsa,
    git_activity,
    activity,
    settings,
    dashboard,
    developer,
    contests,
    feed,
    opportunities,
    email_integration,
    reminders,
    webhooks,
):
    app.include_router(module.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
