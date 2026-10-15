# LifeOS — Unified Developer Profile, Automatic Activity Sync & Opportunity Hub

**Tagline: Plan less. Do more. Grow a little every day.**

A bubbly, full-stack productivity & personal growth web application designed for students and developers to organize daily priorities, build habits, automatically synchronize developer profiles, track coding practice, discover competitions, and visualize 365 days of consistency in an Activity Garden.

---

## Architecture Overview

```
LifeOS/
├── frontend/              Next.js 14 (App Router) + Tailwind CSS          → http://localhost:3000
├── backend/
│   ├── auth-service/      Node.js + Express + Mongoose (JWT, bcrypt)      → http://localhost:4000
│   └── api-service/       Python + FastAPI + PyMongo                      → http://localhost:8000
│       ├── integrations/  GitHub, LeetCode, Codeforces, CodeChef, Contests, Unstop, Email
│       └── routers/       developer, feed, contests, opportunities, email, webhooks, activity...
├── run-all.bat            1-Click Windows Batch launcher
└── run-all.ps1            1-Click PowerShell launcher
```

Both backend services share the same MongoDB database and identical `JWT_SECRET`. Express handles registration and login, while FastAPI validates tokens, enforces user isolation, and runs integrations.

---

## Features & Modules

1. **Developer Hub (`/developer`)**:
   - Unified developer profile covering **GitHub, LeetCode, Codeforces, CodeChef, and Unstop**.
   - Profile cards with live statistics (solved count, rating, rank, repos, followers).
   - One-click **Quick-Connect** with pre-filled handles and individual/all-platform manual sync.
   - Status indicators (Connected, Syncing, Error, Disconnected).

2. **Automatic Activity Tracking**:
   - **GitHub**: Automatic public event sync (pushes, pull requests, issues) + optional HMAC-SHA256 verified Webhooks (`/webhooks/github/{user_id}`).
   - **LeetCode**: GraphQL profile & accepted submission tracking (`recentAcSubmissionList`).
   - **Codeforces**: Official REST API sync for user info, rating changes, and accepted submissions (`verdict == OK`).
   - **CodeChef**: Profile parsing for rating, stars, division, and contest participation history.
   - **Unstop**: Profile integration and opportunity tracking.

3. **Unified Activity Feed (`/feed`)**:
   - Central timeline merging events from GitHub, LeetCode, Codeforces, CodeChef, Unstop, Tasks, Habits, and Focus.
   - Filterable by platform and activity type.

4. **Contest Calendar (`/contests`)**:
   - Aggregated upcoming & live contests from **Codeforces, LeetCode, and CodeChef**.
   - Start times converted to your local timezone, durations, and live countdown timers.
   - Direct registration links and in-app reminder toggles.

5. **Opportunities Hub (`/opportunities`)**:
   - Track hackathons, innovation challenges, coding competitions, and scholarships.
   - Pipeline statuses: `discovered` → `interested` → `registered` → `submitted` → `shortlisted` → `won` / `lost`.
   - Email parsing and Unstop discovery.

6. **Email-Based Opportunity Discovery (`/settings`)**:
   - Automated contest & hackathon detection from Gmail / emails with deadline, prize, and link extraction.
   - Built-in test sample ingestion for quick verification.

7. **Upgraded Activity Garden (`/activity` & Dashboard)**:
   - 365-day contribution garden reflecting actual activity across all connected platforms without double counting.
   - Filterable by platform/category (All, GitHub, LeetCode, Codeforces, CodeChef, Competitions, Tasks, Habits, Focus).
   - Tooltip with detailed daily breakdown.

---

## Quick Start (Local Run)

### Method 1: One-Click Run (Recommended)
From either the root directory or the `LifeOS` folder, run in PowerShell:
```powershell
.\run-all.ps1
```
*(Or double-click `run-all.bat` in Windows File Explorer)*

---

### Method 2: Running in Separate Terminals

#### Terminal 1 — Auth Service (Node.js/Express :4000)
```powershell
cd LifeOS\backend\auth-service
npm run dev
```

#### Terminal 2 — API Service (Python/FastAPI :8000)
```powershell
cd LifeOS\backend\api-service
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

#### Terminal 3 — Frontend (Next.js :3000)
```powershell
cd LifeOS\frontend
npm run dev
```

---

## URLs & Endpoints

- **Web App:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Developer Profiles:** [http://localhost:8000/developer/profiles](http://localhost:8000/developer/profiles)
- **Contest Schedules:** [http://localhost:8000/contests](http://localhost:8000/contests)
- **Activity Feed:** [http://localhost:8000/feed](http://localhost:8000/feed)
- **GitHub Webhook URL:** `http://localhost:8000/webhooks/github/{user_id}`
- **Auth Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
