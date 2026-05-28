import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SessionStart(BaseModel):
    task_id: Optional[uuid.UUID] = None
    duration_min: int = 25


class SessionComplete(BaseModel):
    interrupted: bool = False


class PomodoroSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    task_id: Optional[uuid.UUID]
    duration_min: int
    started_at: datetime
    completed_at: Optional[datetime]
    interrupted: bool


class PomodoroTodayStats(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_minutes: int
    current_session: Optional[PomodoroSessionOut]
