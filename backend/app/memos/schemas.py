import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.tasks_domain.models import Quadrant
from app.tasks_domain.schemas import TaskOut


class MemoCreate(BaseModel):
    content: str = Field(min_length=1)


class MemoUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    is_done: bool | None = None


class MemoConvert(BaseModel):
    quadrant: Quadrant = Quadrant.neither
    due_date: date | None = None


class MemoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    is_done: bool
    done_at: datetime | None
    task_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class MemoConvertOut(BaseModel):
    memo: MemoOut
    task: TaskOut
