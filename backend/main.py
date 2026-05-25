from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import coaches, sessions, kids, attendance, notifications, analytics, auth, payments, locations, events, availability

app = FastAPI(title="Soccer Academy Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(coaches.router,       prefix="/api/coaches",       tags=["Coaches"])
app.include_router(locations.router,     prefix="/api/locations",     tags=["Locations"])
app.include_router(sessions.router,      prefix="/api/sessions",      tags=["Sessions"])
app.include_router(kids.router,          prefix="/api/kids",          tags=["Kids"])
app.include_router(attendance.router,    prefix="/api/attendance",    tags=["Attendance"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(analytics.router,     prefix="/api/analytics",     tags=["Analytics"])
app.include_router(payments.router,      prefix="/api/payments",      tags=["Payments"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(availability.router, prefix="/api/availability", tags=["Availability"])

@app.get("/")
def root():
    return {"message": "Soccer Academy API is running"}