import uuid
from datetime import date as DateType, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.habits.models import HabitFrequency


class HabitCreate(BaseModel):
    name: str
    icon: str = "✅"
    color: str = "#10b981"
    frequency: HabitFrequency = HabitFrequency.daily
    target_count: int = 1


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    frequency: Optional[HabitFrequency] = None
    target_count: Optional[int] = None
    is_active: Optional[bool] = None


class HabitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    icon: str
    color: str
    frequency: HabitFrequency
    target_count: int
    is_active: bool
    created_at: datetime


class HabitRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    habit_id: uuid.UUID
    date: DateType
    completed: bool
    note: Optional[str]


class CheckInBody(BaseModel):
    date: Optional[DateType] = None
    completed: bool = True
    note: Optional[str] = None


class HabitTodayStatus(BaseModel):
    habit: HabitOut
    completed_today: bool
    record: Optional[HabitRecordOut]
