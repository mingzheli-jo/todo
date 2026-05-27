import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.tasks_domain.models import Quadrant, TaskStatus

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    quadrant: Quadrant = Quadrant.neither
    priority: int = 0
    due_date: date | None = None
    tags: list[str] | None = None
    project_id: uuid.UUID | None = None

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    quadrant: Quadrant | None = None
    status: TaskStatus | None = None
    priority: int | None = None
    due_date: date | None = None
    tags: list[str] | None = None
    project_id: uuid.UUID | None = None
    sort_order: int | None = None

class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID | None
    title: str
    description: str | None
    quadrant: Quadrant
    status: TaskStatus
    priority: int
    due_date: date | None
    tags: list[str] | None
    sort_order: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
