from fastapi import APIRouter
from app.database import supabase
from collections import defaultdict

router = APIRouter()

@router.get("/student/{kid_id}")
def student_analytics(kid_id: str):
    attendance = supabase.table("attendance").select("*, sessions(*)").eq("kid_id", kid_id).execute()
    records = attendance.data
    total = len(records)
    present = len([r for r in records if r["status"] == "present"])
    absent = len([r for r in records if r["status"] == "absent"])
    rate = round((present / total) * 100, 1) if total > 0 else 0

    # Attendance trend by month
    monthly = defaultdict(lambda: {"present": 0, "absent": 0})
    for r in records:
        session = r.get("sessions") or {}
        date = session.get("date", "")
        if date and r["status"] in ("present", "absent"):
            month = date[:7]  # YYYY-MM
            monthly[month][r["status"]] += 1
    trend = [{"month": m, **v} for m, v in sorted(monthly.items())]

    # Skills: if sessions have age_group, breakdown by age group attended
    age_group_attendance = defaultdict(lambda: {"present": 0, "total": 0})
    for r in records:
        session = r.get("sessions") or {}
        ag = session.get("age_group", "Unknown")
        age_group_attendance[ag]["total"] += 1
        if r["status"] == "present":
            age_group_attendance[ag]["present"] += 1
    age_breakdown = [
        {"age_group": ag, "rate": round(v["present"]/v["total"]*100, 1) if v["total"] > 0 else 0, "total": v["total"]}
        for ag, v in age_group_attendance.items()
    ]

    return {
        "total_sessions": total,
        "present": present,
        "absent": absent,
        "attendance_rate": rate,
        "records": records,
        "monthly_trend": trend,
        "age_group_breakdown": age_breakdown
    }

@router.get("/coach/{coach_id}")
def coach_analytics(coach_id: str):
    sessions = supabase.table("sessions").select("*").eq("coach_id", coach_id).execute()
    all_sessions = sessions.data
    total = len(all_sessions)
    completed = len([s for s in all_sessions if s["status"] == "completed"])
    cancelled = len([s for s in all_sessions if s["status"] == "cancelled"])
    scheduled = len([s for s in all_sessions if s["status"] == "scheduled"])
    completion_rate = round((completed / total) * 100, 1) if total > 0 else 0

    # Sessions per age group
    age_group_counts = defaultdict(int)
    for s in all_sessions:
        age_group_counts[s.get("age_group", "Unknown")] += 1
    age_breakdown = [{"age_group": ag, "sessions": count} for ag, count in age_group_counts.items()]

    # Monthly sessions
    monthly = defaultdict(int)
    for s in all_sessions:
        date = s.get("date", "")
        if date:
            monthly[date[:7]] += 1
    monthly_sessions = [{"month": m, "sessions": count} for m, count in sorted(monthly.items())]

    # Player attendance under this coach
    session_ids = [s["id"] for s in all_sessions]
    avg_attendance_rate = 0
    if session_ids:
        attendance_data = supabase.table("attendance").select("*").in_("session_id", session_ids).execute()
        att = attendance_data.data
        total_att = len(att)
        present_att = len([a for a in att if a["status"] == "present"])
        avg_attendance_rate = round((present_att / total_att) * 100, 1) if total_att > 0 else 0

    return {
        "total_assigned": total,
        "completed": completed,
        "cancelled": cancelled,
        "scheduled": scheduled,
        "completion_rate": completion_rate,
        "avg_player_attendance_rate": avg_attendance_rate,
        "sessions": all_sessions,
        "age_group_breakdown": age_breakdown,
        "monthly_sessions": monthly_sessions
    }

@router.get("/location")
def location_analytics():
    sessions = supabase.table("sessions").select("*").execute()
    all_sessions = sessions.data

    location_data = defaultdict(lambda: {
        "total": 0, "completed": 0, "cancelled": 0, "scheduled": 0,
        "age_groups": defaultdict(int), "monthly": defaultdict(int)
    })

    for s in all_sessions:
        loc = s.get("location") or "Unknown"
        location_data[loc]["total"] += 1
        status = s.get("status", "scheduled")
        location_data[loc][status] = location_data[loc].get(status, 0) + 1
        ag = s.get("age_group", "Unknown")
        location_data[loc]["age_groups"][ag] += 1
        date = s.get("date", "")
        if date:
            location_data[loc]["monthly"][date[:7]] += 1

    result = []
    for loc, data in location_data.items():
        total = data["total"]
        completed = data.get("completed", 0)
        result.append({
            "location": loc,
            "total_sessions": total,
            "completed": completed,
            "cancelled": data.get("cancelled", 0),
            "scheduled": data.get("scheduled", 0),
            "utilization_rate": round((completed / total) * 100, 1) if total > 0 else 0,
            "age_group_breakdown": [{"age_group": ag, "count": c} for ag, c in data["age_groups"].items()],
            "monthly_trend": [{"month": m, "sessions": c} for m, c in sorted(data["monthly"].items())]
        })

    return result

@router.get("/overview")
def overview_analytics():
    sessions = supabase.table("sessions").select("*").execute()
    kids = supabase.table("kids").select("*").eq("is_active", True).execute()
    coaches = supabase.table("coaches").select("*").eq("is_active", True).execute()
    attendance = supabase.table("attendance").select("*").execute()
    total_att = len(attendance.data)
    present = len([a for a in attendance.data if a["status"] == "present"])

    # Session consistency
    all_sessions = sessions.data
    completed = len([s for s in all_sessions if s["status"] == "completed"])
    cancelled = len([s for s in all_sessions if s["status"] == "cancelled"])

    return {
        "total_sessions": len(all_sessions),
        "total_kids": len(kids.data),
        "total_coaches": len(coaches.data),
        "overall_attendance_rate": round((present / total_att) * 100, 1) if total_att > 0 else 0,
        "sessions_completed": completed,
        "sessions_cancelled": cancelled,
        "session_consistency_rate": round((completed / len(all_sessions)) * 100, 1) if all_sessions else 0
    }

@router.get("/age-group")
def age_group_analytics():
    kids = supabase.table("kids").select("age_group").eq("is_active", True).execute()
    groups = {}
    for k in kids.data:
        g = k["age_group"]
        groups[g] = groups.get(g, 0) + 1

    # Also get attendance per age group
    sessions = supabase.table("sessions").select("*").execute()
    attendance = supabase.table("attendance").select("*").execute()

    session_ag = {s["id"]: s.get("age_group", "Unknown") for s in sessions.data}
    ag_att = defaultdict(lambda: {"present": 0, "total": 0})
    for a in attendance.data:
        ag = session_ag.get(a["session_id"], "Unknown")
        ag_att[ag]["total"] += 1
        if a["status"] == "present":
            ag_att[ag]["present"] += 1

    enriched = {}
    for ag, count in groups.items():
        att = ag_att.get(ag, {"present": 0, "total": 0})
        enriched[ag] = {
            "players": count,
            "attendance_rate": round(att["present"]/att["total"]*100, 1) if att["total"] > 0 else 0
        }
    return enriched

@router.get("/retention")
def retention_analytics():
    """Track how many kids are in each age group (proxy for progression)"""
    kids = supabase.table("kids").select("age_group, is_active").execute()
    active = [k for k in kids.data if k["is_active"]]
    inactive = [k for k in kids.data if not k["is_active"]]

    active_by_group = defaultdict(int)
    for k in active:
        active_by_group[k["age_group"]] += 1

    order = ["U7", "U12_DEV", "U13", "U13_GIRLS"]
    funnel = [{"age_group": ag, "active": active_by_group.get(ag, 0)} for ag in order]

    return {
        "total_active": len(active),
        "total_inactive": len(inactive),
        "funnel": funnel
    }