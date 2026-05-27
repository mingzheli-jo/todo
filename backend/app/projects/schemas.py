import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.projects.models import PDCAPhase

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    color: str = "#6366f1"
    icon: str = "📁"

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_archived: bool | None = None

class PDCAAdvance(BaseModel):
    content: str
    outcome: str | None = None

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    color: str
    icon: str
    pdca_phase: PDCAPhase
    pdca_cycle: int
    is_archived: bool
    created_at: datetime

class PDCALogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    cycle: int
    phase: PDCAPhase
    content: str
    outcome: str | None
    created_at: datetime
