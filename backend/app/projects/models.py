import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class PDCAPhase(str, enum.Enum):
    plan = "plan"
    do = "do"
    check = "check"
    act = "act"

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    icon: Mapped[str] = mapped_column(String(10), default="📁")
    pdca_phase: Mapped[PDCAPhase] = mapped_column(Enum(PDCAPhase), default=PDCAPhase.plan)
    pdca_cycle: Mapped[int] = mapped_column(Integer, default=1)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PDCALog(Base):
    __tablename__ = "pdca_logs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    cycle: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[PDCAPhase] = mapped_column(Enum(PDCAPhase), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
