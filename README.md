# Football Labs — Soccer Academy Manager

A full-stack web application for managing a youth soccer academy. Football Labs helps administrators and coaches handle everything from player enrollment and session scheduling to attendance tracking, payment management, and in-depth analytics — all in one place.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Roles & Access](#roles--access)
- [Analytics](#analytics)
- [Contributing](#contributing)

---

## Features

- **Authentication** — Role-based login for Admins and Coaches, powered by Supabase Auth.
- **Coach Management** — Add, view, and manage coaches across the academy.
- **Player (Kids) Management** — Enroll players, assign age groups (U7, U10, U13, U16), and track active/inactive status.
- **Session Scheduling** — Create and manage training sessions by coach, location, date, and age group.
- **Attendance Tracking** — Mark players as present, absent, or late per session.
- **Payment Management** — Track payment records for enrolled players.
- **Notifications** — Send and manage notifications within the platform.
- **Analytics Dashboard** — Rich insights including:
  - Academy-wide overview (total players, coaches, sessions, attendance rate)
  - Per-student attendance trends and age-group breakdowns
  - Per-coach session completion rates and player attendance stats
  - Location utilization rates
  - Age-group player distribution and retention funnel (U7 → U10 → U13 → U16)
- **Coach Portal** — A dedicated view for coaches to see their own sessions and attendance data.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Tailwind CSS | Styling |
| Recharts | Data visualisation |
| Axios | HTTP client |
| Supabase JS | Auth & realtime client |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| Python / FastAPI | REST API |
| Supabase | PostgreSQL database & Auth |
| Pydantic | Data validation |
| Uvicorn | ASGI server |
| PyJWT | JWT token decoding |
| python-dotenv | Environment configuration |

---

## Project Structure

```
Football-Labs/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   └── app/
│       ├── config.py            # Settings & env vars
│       ├── database.py          # Supabase client
│       └── routes/
│           ├── auth.py          # Login, user creation
│           ├── coaches.py       # Coach CRUD
│           ├── kids.py          # Player CRUD
│           ├── sessions.py      # Session management
│           ├── attendance.py    # Attendance records
│           ├── payments.py      # Payment tracking
│           ├── notifications.py # Notifications
│           ├── locations.py     # Location management
│           └── analytics.py     # Analytics endpoints
│
└── frontend/
    ├── public/
    └── src/
        ├── App.js               # Routes & auth guards
        ├── api/index.js         # Axios API calls
        ├── context/
        │   └── AuthContext.js   # Global auth state
        ├── components/
        │   ├── Navbar.js
        │   ├── StudentFilter.js
        │   └── UI.js
        └── pages/
            ├── Login.js
            ├── AdminDashboard.js
            ├── Coaches.js
            ├── Kids.js
            ├── Sessions.js
            ├── Attendance.js
            ├── Analytics.js
            ├── Payments.js
            ├── Users.js
            └── CoachPortal.js
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- A **Supabase** project with the required tables (`profiles`, `coaches`, `kids`, `sessions`, `attendance`, `payments`, `notifications`, `locations`)

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create a .env file (see Environment Variables below)
cp .env.example .env

# 5. Run the development server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs (Swagger UI) are at `http://localhost:8000/docs`.

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create a .env file
cp .env.example .env

# 4. Start the development server
npm start
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

### Backend — `backend/.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SECRET_KEY=your-secret-key
ANTHROPIC_API_KEY=          # Optional
GROQ_API_KEY=               # Optional
```

### Frontend — `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

---

## API Overview

All routes are prefixed with `/api`.

| Prefix | Tag | Description |
|---|---|---|
| `/api/auth` | Auth | Login, get current user, create users |
| `/api/coaches` | Coaches | List, create, update, delete coaches |
| `/api/locations` | Locations | Manage training venues |
| `/api/sessions` | Sessions | Schedule and manage training sessions |
| `/api/kids` | Kids | Enroll and manage players |
| `/api/attendance` | Attendance | Mark and query attendance records |
| `/api/notifications` | Notifications | Create and list notifications |
| `/api/analytics` | Analytics | Reporting and insights endpoints |
| `/api/payments` | Payments | Track player payments |

Full interactive docs available at `/docs` when the backend is running.

---

## Roles & Access

| Feature | Admin | Coach |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Manage Coaches | ✅ | ❌ |
| Manage Players | ✅ | ❌ |
| Manage Sessions | ✅ | ❌ |
| Attendance | ✅ | ✅ |
| Analytics | ✅ | ✅ |
| Payments | ✅ | ❌ |
| Coach Portal | ❌ | ✅ |
| Create Users | ✅ | ❌ |

User accounts are created by admins. Each user has a `profiles` record in Supabase that stores their role and, for coaches, a link to their coach record.

---

## Analytics

The analytics module provides the following endpoints:

- **`GET /api/analytics/overview`** — Academy-wide KPIs: total players, coaches, sessions, overall attendance rate, session consistency rate.
- **`GET /api/analytics/student/{kid_id}`** — Individual player stats: attendance rate, monthly trend, age-group breakdown.
- **`GET /api/analytics/coach/{coach_id}`** — Coach stats: sessions completed/cancelled, player attendance rate, monthly session trend.
- **`GET /api/analytics/location`** — Venue utilisation rates and session breakdowns per location.
- **`GET /api/analytics/age-group`** — Player count and attendance rate per age group.
- **`GET /api/analytics/retention`** — Player retention funnel across age groups (U7 → U10 → U13 → U16).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---
