from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.database import supabase
from typing import Optional, List

router = APIRouter()

class AvailabilitySubmit(BaseModel):
    coach_id: str
    dates: List[str]                      # weekday dates (full-day availability)
    weekend_slots: List[dict] = []        # [{ "date": "YYYY-MM-DD", "slot": "morning"|"afternoon" }, ...]
    week_start: str                       # YYYY-MM-DD (Monday of that week)
    notes: Optional[str] = None

@router.post("/submit")
def submit_availability(data: AvailabilitySubmit):
    """Coach submits their available dates for a week. Replaces any existing for that week."""
    # Delete existing for this coach + week
    supabase.table("coach_availability") \
        .delete() \
        .eq("coach_id", data.coach_id) \
        .eq("week_start", data.week_start) \
        .execute()

    records = [
        {
            "coach_id": data.coach_id,
            "date": d,
            "week_start": data.week_start,
            "notes": data.notes,
            "slot": "full",
        }
        for d in data.dates
    ]

    for ws in data.weekend_slots:
        records.append({
            "coach_id": data.coach_id,
            "date": ws["date"],
            "week_start": data.week_start,
            "notes": data.notes,
            "slot": ws["slot"],
        })

    if records:
        supabase.table("coach_availability").insert(records).execute()

    return {"message": "Availability submitted", "count": len(records)}

@router.get("/week")
def get_week_availability(week_start: str = Query(...)):
    """Admin view — all coaches' availability for a given week."""
    res = supabase.table("coach_availability") \
        .select("*, coaches(id, name, email, age_groups)") \
        .eq("week_start", week_start) \
        .execute()

    # Group by coach
    coaches_map = {}
    for row in res.data:
        coach = row.get("coaches") or {}
        cid   = row["coach_id"]
        if cid not in coaches_map:
            coaches_map[cid] = {
                "coach_id": cid,
                "coach": coach,
                "dates": [],          # full-day weekday dates
                "weekend_slots": [],  # [{date, slot}]
                "notes": row.get("notes"),
            }
        if row.get("slot") in ("morning", "afternoon"):
            coaches_map[cid]["weekend_slots"].append({"date": row["date"], "slot": row["slot"]})
        else:
            coaches_map[cid]["dates"].append(row["date"])

    return list(coaches_map.values())

@router.get("/coach/{coach_id}")
def get_coach_availability(coach_id: str, week_start: str = Query(...)):
    """Coach fetches their own submitted availability for a week."""
    res = supabase.table("coach_availability") \
        .select("*") \
        .eq("coach_id", coach_id) \
        .eq("week_start", week_start) \
        .execute()

    dates = [r["date"] for r in res.data if r.get("slot", "full") == "full"]
    weekend_slots = [{"date": r["date"], "slot": r["slot"]} for r in res.data if r.get("slot") in ("morning", "afternoon")]
    notes = res.data[0]["notes"] if res.data else ""
    return {"dates": dates, "weekend_slots": weekend_slots, "notes": notes}