import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DailyReview(Base):
    __tablename__ = "daily_reviews"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_daily_reviews_user_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    raw_content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ai_structured: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_polished: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
