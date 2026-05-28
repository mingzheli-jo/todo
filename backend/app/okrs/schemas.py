import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.okrs.models import OKRType, OKRStatus


class OKRCreate(BaseModel):
    type: OKRType
    title: str
    description: Optional[str] = None
    period: str
    parent_id: Optional[uuid.UUID] = None
    progress: int = 0
    status: OKRStatus = OKRStatus.active


class OKRUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    period: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[OKRStatus] = None


class OKROut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID]
    type: OKRType
    title: str
    description: Optional[str]
    period: str
    progress: int
    status: OKRStatus
    created_at: datetime
    updated_at: datetime
    children: list["OKROut"] = []


OKROut.model_rebuild()
