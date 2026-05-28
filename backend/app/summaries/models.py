import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, JSON, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SummaryType(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"


class AISummary(Base):
    __tablename__ = "ai_summaries"
    __table_args__ = (UniqueConstraint("user_id", "type", "period_start", name="uq_ai_summaries_user_type_period"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type: Mapped[SummaryType] = mapped_column(Enum(SummaryType), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pushed_feishu: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
