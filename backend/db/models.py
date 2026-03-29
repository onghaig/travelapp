from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime
import uuid


class Profile(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    preferences: dict = {}
    created_at: Optional[datetime] = None


class Trip(BaseModel):
    id: str = ""
    user_id: str
    destination: str
    departure_date: Optional[date] = None
    return_date: Optional[date] = None
    num_travelers: int = 1
    budget_total: Optional[float] = None
    budget_breakdown: dict = {}
    status: str = "planning"
    state_json: dict = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Booking(BaseModel):
    id: str = ""
    trip_id: str
    type: str
    status: str = "pending"
    provider: Optional[str] = None
    details: dict = {}
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    booking_url: Optional[str] = None
    confirmation_number: Optional[str] = None
    created_at: Optional[datetime] = None


class CalendarEvent(BaseModel):
    id: str = ""
    trip_id: str
    booking_id: Optional[str] = None
    type: str
    title: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    gcal_event_id: Optional[str] = None
    color: Optional[str] = None
    metadata: dict = {}


class BudgetItem(BaseModel):
    id: str = ""
    trip_id: str
    category: str
    label: Optional[str] = None
    estimated_cost: float = 0
    actual_cost: Optional[float] = None
    status: str = "estimated"


class Message(BaseModel):
    id: str = ""
    trip_id: str
    role: str
    content: str
    metadata: dict = {}
    created_at: Optional[datetime] = None
