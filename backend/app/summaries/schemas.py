import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class SummaryGenerateRequest(BaseModel):
    type: str  # "weekly" or "monthly"
    period_start: date
    period_end: date


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    period_start: date
    period_end: date
    content: str
    metrics: dict | None
    pushed_feishu: bool
    created_at: datetime
