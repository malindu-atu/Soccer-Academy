from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase
from app.config import settings
from supabase import create_client
import jwt
import time
from typing import Optional

router = APIRouter()

# Service role client needed for admin user operations
service_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY) if settings.SUPABASE_SERVICE_KEY else None

class MeRequest(BaseModel):
    access_token: str

class CreateUserRequest(BaseModel):
    access_token: str
    email: str
    password: str
    first_name: str
    last_name: str
    role: str
    coach_id: Optional[str] = None

class DeleteUserRequest(BaseModel):
    access_token: str
    user_id: str

def _verify_admin(access_token: str) -> str:
    """Decode token, verify role=admin, return requester user_id."""
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        requester_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    profile_res = supabase.table("profiles").select("role").eq("id", requester_id).execute()
    if not profile_res.data or profile_res.data[0]["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    return requester_id

@router.post("/me")
def get_me(req: MeRequest):
    try:
        payload = jwt.decode(req.access_token, options={"verify_signature": False})
        user_id = payload.get("sub")
        email   = payload.get("email")
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=403, detail="No profile found. Contact admin.")

    profile = profile_res.data[0]
    role    = profile.get("role")

    if role == "admin":
        return {"role": "admin", "email": email, "profile": profile}

    if role == "coach":
        coach = None
        if profile.get("coach_id"):
            coach_res = supabase.table("coaches").select("*").eq("id", profile["coach_id"]).execute()
            coach = coach_res.data[0] if coach_res.data else None
        return {"role": "coach", "email": email, "profile": profile, "coach": coach}

    raise HTTPException(status_code=403, detail="Unknown role")


@router.post("/create-user")
def create_user(req: CreateUserRequest):
    _verify_admin(req.access_token)

    if req.role not in ("admin", "coach"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'coach'")

    if not service_supabase:
        raise HTTPException(
            status_code=500,
            detail="Service key not configured. Add SUPABASE_SERVICE_KEY to environment variables."
        )

    try:
        user = service_supabase.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": req.first_name,
                "last_name":  req.last_name,
                "role":       req.role,
            }
        })
        new_user_id = user.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Retry updating the profile since the Supabase trigger
    # that creates the profile row runs asynchronously
    updates = {
        "first_name": req.first_name,
        "last_name":  req.last_name,
        "role":       req.role,
    }
    if req.coach_id:
        updates["coach_id"] = req.coach_id

    for attempt in range(5):
        time.sleep(0.5)
        profile_check = supabase.table("profiles").select("id").eq("id", new_user_id).execute()
        if profile_check.data:
            supabase.table("profiles").update(updates).eq("id", new_user_id).execute()
            break

    return {
        "message": "User created successfully",
        "user_id": new_user_id,
        "email":   req.email,
        "role":    req.role,
    }


@router.get("/users")
def list_users(access_token: str):
    """Return all profiles with their auth email joined."""
    _verify_admin(access_token)

    profiles_res = supabase.table("profiles").select("*, coaches(id, name, email)").execute()
    profiles     = profiles_res.data

    email_map = {}
    if service_supabase:
        try:
            auth_users = service_supabase.auth.admin.list_users()
            for u in auth_users:
                email_map[u.id] = u.email
        except Exception:
            pass

    for p in profiles:
        p["email"] = email_map.get(p["id"], "—")

    return profiles


@router.delete("/users/{user_id}")
def delete_user(user_id: str, req: DeleteUserRequest):
    """Delete a user's auth account and profile."""
    requester_id = _verify_admin(req.access_token)

    if user_id == requester_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    supabase.table("profiles").delete().eq("id", user_id).execute()

    if service_supabase:
        try:
            service_supabase.auth.admin.delete_user(user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auth deletion failed: {str(e)}")

    return {"message": "User deleted"}