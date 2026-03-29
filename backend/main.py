import json
import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

from backend.redis_client import redis_client
from backend.db.supabase import get_supabase, get_supabase_anon
from backend.agents.orchestrator import OrchestratorAgent


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.connect()
    yield
    await redis_client.disconnect()


app = FastAPI(title="Travvy API", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        supabase = get_supabase()
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": response.user.id, "email": response.user.email}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Authentication failed") from exc


# ── Request/Response models ───────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    trip_id: str
    message: str


class ChangeRequest(BaseModel):
    trip_id: str
    message: str
    affected_agents: Optional[list[str]] = None


class CreateTripRequest(BaseModel):
    destination: str
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    num_travelers: int = 1
    budget_total: Optional[float] = None


class UpdateTripRequest(BaseModel):
    destination: Optional[str] = None
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    num_travelers: Optional[int] = None
    budget_total: Optional[float] = None
    status: Optional[str] = None
    state_json: Optional[dict] = None


class UpdateBookingRequest(BaseModel):
    status: Optional[str] = None
    confirmation_number: Optional[str] = None
    actual_cost: Optional[float] = None


class InitiateBookingRequest(BaseModel):
    booking_type: str
    item_id: str
    traveler_info: dict


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    redis_ok = await redis_client.ping()
    return {"status": "ok", "redis": redis_ok}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    try:
        supabase = get_supabase_anon()
        response = supabase.auth.sign_in_with_password(
            {"email": request.email, "password": request.password}
        )
        return {
            "access_token": response.session.access_token,
            "user": {"id": response.user.id, "email": response.user.email},
        }
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.post("/api/auth/signup")
async def signup(request: SignupRequest):
    try:
        supabase = get_supabase_anon()
        response = supabase.auth.sign_up(
            {"email": request.email, "password": request.password}
        )
        if not response.session:
            # Email confirmation required — no session yet
            return {"message": "Check your email to confirm your account."}
        return {
            "access_token": response.session.access_token,
            "user": {"id": response.user.id, "email": response.user.email},
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/auth/logout")
async def logout(user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Trips ─────────────────────────────────────────────────────────────────────

@app.get("/api/trips")
async def list_trips(user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("trips")
            .select("*")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return {"trips": response.data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/trips")
async def create_trip(request: CreateTripRequest, user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        trip_data = {
            "user_id": user["id"],
            "destination": request.destination,
            "num_travelers": request.num_travelers,
            "status": "planning",
            "state_json": {},
        }
        if request.departure_date:
            trip_data["departure_date"] = request.departure_date
        if request.return_date:
            trip_data["return_date"] = request.return_date
        if request.budget_total:
            trip_data["budget_total"] = request.budget_total

        response = supabase.table("trips").insert(trip_data).execute()
        trip = response.data[0]

        # Initialize Redis state
        await redis_client.set_trip_state(trip["id"], trip_data)

        return {"trip": trip}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/trips/{trip_id}")
async def get_trip(trip_id: str, user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("trips")
            .select("*")
            .eq("id", trip_id)
            .eq("user_id", user["id"])
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        return {"trip": response.data[0]}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.patch("/api/trips/{trip_id}")
async def update_trip(
    trip_id: str, request: UpdateTripRequest, user=Depends(get_current_user)
):
    try:
        supabase = get_supabase()
        # Verify ownership
        existing = (
            supabase.table("trips")
            .select("id")
            .eq("id", trip_id)
            .eq("user_id", user["id"])
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        update_data = {k: v for k, v in request.model_dump().items() if v is not None}
        if update_data:
            supabase.table("trips").update(update_data).eq("id", trip_id).execute()

        if request.state_json:
            await redis_client.set_trip_state(trip_id, request.state_json)

        return {"message": "Trip updated"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Chat ──────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: ChatRequest, user=Depends(get_current_user)):
    trip_state = await redis_client.get_trip_state(request.trip_id)
    history = await redis_client.get_messages(request.trip_id)

    # Fall back to Supabase when Redis has no history
    if not history:
        try:
            supabase = get_supabase()
            msg_resp = (
                supabase.table("messages")
                .select("role,content")
                .eq("trip_id", request.trip_id)
                .order("created_at")
                .execute()
            )
            history = [{"role": m["role"], "content": m["content"]} for m in msg_resp.data]
        except Exception:
            history = []

    # Fall back to Supabase for trip state too
    if not trip_state:
        try:
            supabase = get_supabase()
            trip_resp = (
                supabase.table("trips")
                .select("state_json")
                .eq("id", request.trip_id)
                .single()
                .execute()
            )
            trip_state = trip_resp.data.get("state_json") or {}
        except Exception:
            trip_state = {}

    orchestrator = OrchestratorAgent(trip_state, user)

    async def event_stream():
        try:
            new_history = list(history)
            new_history.append({"role": "user", "content": request.message})
            assistant_content = ""

            async for chunk in orchestrator.stream(request.message, history):
                if chunk.get("type") == "text_delta":
                    assistant_content += chunk.get("content", "")
                elif chunk.get("type") == "trip_state_update":
                    # Persist updated state to Redis and DB
                    new_state = chunk["state"]
                    await redis_client.set_trip_state(request.trip_id, new_state)
                    try:
                        supabase = get_supabase()
                        supabase.table("trips").update(
                            {"state_json": new_state}
                        ).eq("id", request.trip_id).execute()
                    except Exception:
                        pass
                yield f"data: {json.dumps(chunk)}\n\n"

            # Save conversation history
            if assistant_content:
                new_history.append({"role": "assistant", "content": assistant_content})
                await redis_client.set_messages(request.trip_id, new_history)

                try:
                    supabase = get_supabase()
                    supabase.table("messages").insert([
                        {
                            "trip_id": request.trip_id,
                            "role": "user",
                            "content": request.message,
                        },
                        {
                            "trip_id": request.trip_id,
                            "role": "assistant",
                            "content": assistant_content,
                        },
                    ]).execute()
                except Exception:
                    pass

            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/chat/change")
async def chat_change(request: ChangeRequest, user=Depends(get_current_user)):
    trip_state = await redis_client.get_trip_state(request.trip_id)
    history = await redis_client.get_messages(request.trip_id)
    orchestrator = OrchestratorAgent(trip_state, user)

    async def event_stream():
        try:
            async for chunk in orchestrator.stream(request.message, history):
                if chunk.get("type") == "trip_state_update":
                    new_state = chunk["state"]
                    await redis_client.set_trip_state(request.trip_id, new_state)
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Calendar ──────────────────────────────────────────────────────────────────

@app.get("/api/trips/{trip_id}/calendar")
async def get_calendar(trip_id: str, user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        # Verify ownership
        trip = (
            supabase.table("trips")
            .select("id")
            .eq("id", trip_id)
            .eq("user_id", user["id"])
            .execute()
        )
        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        events = (
            supabase.table("calendar_events")
            .select("*")
            .eq("trip_id", trip_id)
            .execute()
        )
        return {"events": events.data}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Budget ────────────────────────────────────────────────────────────────────

@app.get("/api/trips/{trip_id}/budget")
async def get_budget(trip_id: str, user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        trip = (
            supabase.table("trips")
            .select("id")
            .eq("id", trip_id)
            .eq("user_id", user["id"])
            .execute()
        )
        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        items = (
            supabase.table("budget_items")
            .select("*")
            .eq("trip_id", trip_id)
            .execute()
        )
        return {"items": items.data}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Bookings ──────────────────────────────────────────────────────────────────

@app.post("/api/bookings/{trip_id}/initiate")
async def initiate_booking(
    trip_id: str,
    request: InitiateBookingRequest,
    user=Depends(get_current_user),
):
    try:
        supabase = get_supabase()
        trip = (
            supabase.table("trips")
            .select("id, state_json")
            .eq("id", trip_id)
            .eq("user_id", user["id"])
            .execute()
        )
        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        from backend.agents.booking_agent import BookingAgent
        agent = BookingAgent()
        result = await agent.run({
            "booking_type": request.booking_type,
            "item_id": request.item_id,
            "traveler_info": request.traveler_info,
        })

        # Create booking record
        booking = supabase.table("bookings").insert({
            "trip_id": trip_id,
            "type": request.booking_type,
            "status": "pending",
            "details": result,
        }).execute()

        return {"booking": booking.data[0], "result": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/bookings/{trip_id}")
async def list_bookings(trip_id: str, user=Depends(get_current_user)):
    try:
        supabase = get_supabase()
        trip = (
            supabase.table("trips")
            .select("id")
            .eq("id", trip_id)
            .eq("user_id", user["id"])
            .execute()
        )
        if not trip.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        bookings = (
            supabase.table("bookings")
            .select("*")
            .eq("trip_id", trip_id)
            .execute()
        )
        return {"bookings": bookings.data}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.patch("/api/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    request: UpdateBookingRequest,
    user=Depends(get_current_user),
):
    try:
        supabase = get_supabase()
        update_data = {k: v for k, v in request.model_dump().items() if v is not None}
        if update_data:
            supabase.table("bookings").update(update_data).eq("id", booking_id).execute()
        return {"message": "Booking updated"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
