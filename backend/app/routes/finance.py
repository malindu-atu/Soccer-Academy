from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.database import supabase
from typing import Optional
from datetime import date
from collections import defaultdict

router = APIRouter()

# ── Models ────────────────────────────────────────────────────────────────────

class RateUpdate(BaseModel):
    rate_per_session: float
    
class OtherIncomeCreate(BaseModel):
    title: str
    amount: float
    month: str
    category: str = "sponsor"
    notes: Optional[str] = None

class FixedExpenseCreate(BaseModel):
    title: str
    amount: float

class VariableExpenseCreate(BaseModel):
    title: str
    amount: float
    month: str
    notes: Optional[str] = None

class SalaryCreate(BaseModel):
    coach_id: str
    amount: float
    month: str
    notes: Optional[str] = None

class PaymentUpsert(BaseModel):
    kid_id: str
    month: str
    status: str
    amount: Optional[float] = None
    note: Optional[str] = None
    is_manual_amount: bool = False
    
    
# ── Session rates (per age group) ────────────────────────────────────────────

@router.get("/rates")
def get_rates():
    res = supabase.table("finance_rates").select("*").order("age_group").execute()
    return res.data

@router.put("/rates/{age_group}")
def update_rate(age_group: str, data: RateUpdate):
    res = supabase.table("finance_rates").update({"rate_per_session": data.rate_per_session}) \
        .eq("age_group", age_group).execute()
    if not res.data:
        res = supabase.table("finance_rates").insert({
            "age_group": age_group, "rate_per_session": data.rate_per_session
        }).execute()
    return res.data[0]

# ── Payment (student fees) ────────────────────────────────────────────────────

@router.get("/payments")
def get_payments(
    month: str = Query(...),
    location_id: Optional[str] = Query(None),
    age_group: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    kids_query = supabase.table("kids").select("*, locations(id, name)").eq("is_active", True)
    if location_id:
        kids_query = kids_query.eq("location_id", location_id)
    if age_group:
        kids_query = kids_query.eq("age_group", age_group)
    if search:
        kids_query = kids_query.ilike("name", f"%{search}%")
    kids_res = kids_query.execute()
    kids = kids_res.data

    if not kids:
        return {"kids": [], "payment_map": {}}

    kid_ids = [k["id"] for k in kids]

    # Rates per age group
    rates_res = supabase.table("finance_rates").select("*").execute()
    rate_map = {r["age_group"]: r["rate_per_session"] for r in rates_res.data}

    # Sessions in this month
    month_start = f"{month}-01"
    month_end = _next_month_start(month)
    sessions_res = supabase.table("sessions").select("id").gte("date", month_start).lt("date", month_end).execute()
    session_ids_this_month = {s["id"] for s in sessions_res.data}

    # Attendance (present only) for these kids, this month
    attended_count = defaultdict(int)
    if session_ids_this_month:
        att_res = supabase.table("attendance").select("kid_id, session_id, status") \
            .in_("kid_id", kid_ids).eq("status", "present").execute()
        for a in att_res.data:
            if a["session_id"] in session_ids_this_month:
                attended_count[a["kid_id"]] += 1

    # Existing payment records
    payments_res = supabase.table("payments").select("*").eq("month", month).in_("kid_id", kid_ids).execute()
    payment_map = {p["kid_id"]: p for p in payments_res.data}

    # Attach computed fields to each kid
    for k in kids:
        sessions_attended = attended_count.get(k["id"], 0)
        rate = rate_map.get(k["age_group"], 0)
        calculated_amount = sessions_attended * rate
        k["sessions_attended"] = sessions_attended
        k["rate_per_session"] = rate
        k["calculated_amount"] = calculated_amount

        existing = payment_map.get(k["id"])
        if existing and existing.get("is_manual_amount"):
            payment_map[k["id"]]["display_amount"] = existing["amount"]
        else:
            payment_map[k["id"]] = payment_map.get(k["id"], {})
            payment_map[k["id"]]["display_amount"] = calculated_amount

    return {"kids": kids, "payment_map": payment_map}


def _next_month_start(month: str) -> str:
    y, m = map(int, month.split("-"))
    if m == 12:
        return f"{y+1}-01-01"
    return f"{y}-{str(m+1).zfill(2)}-01"

@router.post("/payments")
def upsert_payment(data: PaymentUpsert):
    existing = supabase.table("payments").select("id") \
        .eq("kid_id", data.kid_id).eq("month", data.month).execute()
    record = {
        "kid_id": data.kid_id, "month": data.month,
        "status": data.status, "amount": data.amount,
        "note": data.note, "is_manual_amount": data.is_manual_amount,
        "updated_at": date.today().isoformat()
    }
    if existing.data:
        res = supabase.table("payments").update(record).eq("id", existing.data[0]["id"]).execute()
    else:
        res = supabase.table("payments").insert(record).execute()
    return res.data[0]

@router.get("/payments/summary/{month}")
def payment_summary(month: str, location_id: Optional[str] = Query(None)):
    kids_query = supabase.table("kids").select("id").eq("is_active", True)
    if location_id:
        kids_query = kids_query.eq("location_id", location_id)
    kids_res     = kids_query.execute()
    kid_ids      = [k["id"] for k in kids_res.data]
    payments_res = supabase.table("payments").select("*").eq("month", month).execute()
    payment_map  = {p["kid_id"]: p for p in payments_res.data}

    total  = len(kid_ids)
    paid   = sum(1 for k in kid_ids if payment_map.get(k, {}).get("status") == "paid")
    waived = sum(1 for k in kid_ids if payment_map.get(k, {}).get("status") == "waived")
    unpaid = total - paid - waived
    total_collected = sum(
        payment_map[k]["amount"] or 0
        for k in kid_ids
        if payment_map.get(k, {}).get("status") == "paid" and payment_map.get(k, {}).get("amount")
    )
    return {
        "total": total, "paid": paid, "waived": waived, "unpaid": unpaid,
        "total_collected": total_collected,
        "collection_rate": round((paid / total) * 100, 1) if total > 0 else 0
    }

# ── Other income ──────────────────────────────────────────────────────────────

@router.get("/other-income")
def get_other_income(month: str = Query(...)):
    res = supabase.table("other_income").select("*").eq("month", month).order("created_at").execute()
    return res.data

@router.post("/other-income")
def create_other_income(data: OtherIncomeCreate):
    res = supabase.table("other_income").insert(data.dict()).execute()
    return res.data[0]

@router.delete("/other-income/{id}")
def delete_other_income(id: str):
    supabase.table("other_income").delete().eq("id", id).execute()
    return {"message": "Deleted"}

# ── Fixed expenses ────────────────────────────────────────────────────────────

@router.get("/fixed-expenses")
def get_fixed_expenses():
    res = supabase.table("fixed_expenses").select("*").eq("is_active", True).order("created_at").execute()
    return res.data

@router.post("/fixed-expenses")
def create_fixed_expense(data: FixedExpenseCreate):
    res = supabase.table("fixed_expenses").insert(data.dict()).execute()
    return res.data[0]

@router.delete("/fixed-expenses/{id}")
def delete_fixed_expense(id: str):
    supabase.table("fixed_expenses").update({"is_active": False}).eq("id", id).execute()
    return {"message": "Deleted"}

# ── Variable expenses ─────────────────────────────────────────────────────────

@router.get("/variable-expenses")
def get_variable_expenses(month: str = Query(...)):
    res = supabase.table("variable_expenses").select("*").eq("month", month).order("created_at").execute()
    return res.data

@router.post("/variable-expenses")
def create_variable_expense(data: VariableExpenseCreate):
    res = supabase.table("variable_expenses").insert(data.dict()).execute()
    return res.data[0]

@router.delete("/variable-expenses/{id}")
def delete_variable_expense(id: str):
    supabase.table("variable_expenses").delete().eq("id", id).execute()
    return {"message": "Deleted"}

# ── Salaries ──────────────────────────────────────────────────────────────────

@router.get("/salaries")
def get_salaries(month: str = Query(...)):
    res = supabase.table("salary_expenses").select("*, coaches(id, name)").eq("month", month).order("created_at").execute()
    return res.data

@router.post("/salaries")
def create_salary(data: SalaryCreate):
    res = supabase.table("salary_expenses").insert(data.dict()).execute()
    return res.data[0]

@router.delete("/salaries/{id}")
def delete_salary(id: str):
    supabase.table("salary_expenses").delete().eq("id", id).execute()
    return {"message": "Deleted"}

# ── Monthly summary ───────────────────────────────────────────────────────────

@router.get("/summary/{month}")
def get_monthly_summary(month: str):
    # Student fee income
    payments_res    = supabase.table("payments").select("*").eq("month", month).execute()
    student_income  = sum(
        p["amount"] or 0 for p in payments_res.data
        if p["status"] == "paid" and p.get("amount")
    )

    # Other income
    other_res    = supabase.table("other_income").select("amount").eq("month", month).execute()
    other_income = sum(r["amount"] for r in other_res.data)

    # Fixed expenses (always apply)
    fixed_res      = supabase.table("fixed_expenses").select("amount").eq("is_active", True).execute()
    fixed_total    = sum(r["amount"] for r in fixed_res.data)

    # Variable expenses
    variable_res   = supabase.table("variable_expenses").select("amount").eq("month", month).execute()
    variable_total = sum(r["amount"] for r in variable_res.data)

    # Salaries
    salary_res     = supabase.table("salary_expenses").select("amount").eq("month", month).execute()
    salary_total   = sum(r["amount"] for r in salary_res.data)

    total_income   = student_income + other_income
    total_expenses = fixed_total + variable_total + salary_total
    net            = total_income - total_expenses

    return {
        "month":           month,
        "student_income":  student_income,
        "other_income":    other_income,
        "total_income":    total_income,
        "fixed_expenses":  fixed_total,
        "variable_expenses": variable_total,
        "salary_expenses": salary_total,
        "total_expenses":  total_expenses,
        "net":             net,
    }