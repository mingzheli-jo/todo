import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class OKRType(str, enum.Enum):
    objective = "objective"
    key_result = "key_result"


class OKRStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


# Association table for task-OKR links
task_okr_link = Table(
    "task_okr_links",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("okr_id", UUID(as_uuid=True), ForeignKey("okrs.id", ondelete="CASCADE"), primary_key=True),
)


class OKR(Base):
    __tablename__ = "okrs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("okrs.id"), nullable=True)
    type: Mapped[OKRType] = mapped_column(Enum(OKRType), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    period: Mapped[str] = mapped_column(String(20), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[OKRStatus] = mapped_column(Enum(OKRStatus), default=OKRStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
