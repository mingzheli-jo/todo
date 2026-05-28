import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    date: date
    raw_content: str = ""
    mood: int | None = Field(None, ge=1, le=5)


class ReviewUpdate(BaseModel):
    raw_content: str | None = None
    mood: int | None = Field(None, ge=1, le=5)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    raw_content: str
    ai_structured: dict | None
    ai_polished: str | None
    mood: int | None
    ai_task_id: str | None
    created_at: datetime
    updated_at: datetime
