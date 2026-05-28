import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.encryption import EncryptedString


class FeishuConfig(Base):
    __tablename__ = "feishu_configs"
    __table_args__ = (UniqueConstraint("user_id", name="uq_feishu_configs_user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    webhook_url: Mapped[str | None] = mapped_column(EncryptedString(500), nullable=True)
    push_weekly: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    push_monthly: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    push_hour: Mapped[int] = mapped_column(Integer, default=9, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
