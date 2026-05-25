from fastapi import APIRouter, Query
from fastapi import HTTPException
from pydantic import BaseModel
from app.database import supabase
from typing import Optional, List

router = APIRouter()

class EventCreate(BaseModel):
    title: str
    date: str                        # YYYY-MM-DD
    description: Optional[str] = None
    status: str = "pending"
    coach_ids: Optional[List[str]] = []
    kid_ids: Optional[List[str]] = []

class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    coach_ids: Optional[List[str]] = None
    kid_ids: Optional[List[str]] = None

@router.get("/")
def get_events(month: Optional[str] = Query(None)):
    """Get all events, optionally filtered by month (YYYY-MM)"""
    query = supabase.table("events").select("*")
    if month:
        start = f"{month}-01"
        end   = _next_month_start(month)
        query = query.gte("date", start).lt("date", end)
    res = query.order("date").execute()
    events = res.data

    # Attach coach and kid assignments
    for event in events:
        try:
            coaches_res = supabase.table("event_coaches") \
                .select("coach_id, coaches(id, name, email)") \
                .eq("event_id", event["id"]).execute()
            event["coaches"] = [
                r["coaches"] for r in coaches_res.data if r.get("coaches")
            ]
        except Exception:
            event["coaches"] = []

        try:
            kids_res = supabase.table("event_kids") \
                .select("kid_id, kids(id, name, age_group)") \
                .eq("event_id", event["id"]).execute()
            event["kids"] = [
                r["kids"] for r in kids_res.data if r.get("kids")
            ]
        except Exception:
            event["kids"] = []

    return events

@router.post("/")
def create_event(data: EventCreate):
    res = supabase.table("events").insert({
        "title":       data.title,
        "date":        data.date,
        "description": data.description,
        "status":      data.status,
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create event")

    event    = res.data[0]
    event_id = event["id"]

    if data.coach_ids:
        supabase.table("event_coaches").insert([
            {"event_id": event_id, "coach_id": cid} for cid in data.coach_ids
        ]).execute()

    if data.kid_ids:
        supabase.table("event_kids").insert([
            {"event_id": event_id, "kid_id": kid} for kid in data.kid_ids
        ]).execute()

    event["coaches"] = []
    event["kids"]    = []
    return event

@router.put("/{event_id}")
def update_event(event_id: str, data: EventUpdate):
    updates = {}
    if data.title       is not None: updates["title"]       = data.title
    if data.date        is not None: updates["date"]        = data.date
    if data.description is not None: updates["description"] = data.description
    if data.status      is not None: updates["status"]      = data.status

    if updates:
        supabase.table("events").update(updates).eq("id", event_id).execute()

    if data.coach_ids is not None:
        supabase.table("event_coaches").delete().eq("event_id", event_id).execute()
        if data.coach_ids:
            supabase.table("event_coaches").insert([
                {"event_id": event_id, "coach_id": cid} for cid in data.coach_ids
            ]).execute()

    if data.kid_ids is not None:
        supabase.table("event_kids").delete().eq("event_id", event_id).execute()
        if data.kid_ids:
            supabase.table("event_kids").insert([
                {"event_id": event_id, "kid_id": kid} for kid in data.kid_ids
            ]).execute()

    return {"message": "Event updated"}

@router.delete("/{event_id}")
def delete_event(event_id: str):
    supabase.table("event_coaches").delete().eq("event_id", event_id).execute()
    supabase.table("event_kids").delete().eq("event_id", event_id).execute()
    supabase.table("events").delete().eq("id", event_id).execute()
    return {"message": "Event deleted"}

def _next_month_start(month: str) -> str:
    y, m = map(int, month.split("-"))
    if m == 12:
        return f"{y+1}-01-01"
    return f"{y}-{str(m+1).zfill(2)}-01"