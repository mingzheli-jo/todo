"""add phase 2-5 tables: ai_providers, daily_reviews, okrs, habits, pomodoro, ai_summaries, feishu_configs

Revision ID: 002
Revises: 001
Create Date: 2026-05-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PostgreSQL ENUM types with create_type=False — we create them manually via SQL
# to avoid SQLAlchemy auto-emitting CREATE TYPE during op.create_table.
okrtype = ENUM("objective", "key_result", name="okrtype", create_type=False)
okrstatus = ENUM("active", "completed", "cancelled", name="okrstatus", create_type=False)
habitfrequency = ENUM("daily", "weekday", "weekly", name="habitfrequency", create_type=False)
summarytype = ENUM("weekly", "monthly", name="summarytype", create_type=False)


def upgrade() -> None:
    # Create enum types idempotently via raw SQL
    op.execute("DO $$ BEGIN CREATE TYPE okrtype AS ENUM ('objective', 'key_result'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE okrstatus AS ENUM ('active', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE habitfrequency AS ENUM ('daily', 'weekday', 'weekly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE summarytype AS ENUM ('weekly', 'monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

    # --- ai_providers ---
    op.create_table(
        "ai_providers",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("api_key_enc", sa.String(1000), nullable=True),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_providers")),
    )

    # --- daily_reviews ---
    op.create_table(
        "daily_reviews",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=False, server_default=""),
        sa.Column("ai_structured", sa.JSON(), nullable=True),
        sa.Column("ai_polished", sa.Text(), nullable=True),
        sa.Column("mood", sa.Integer(), nullable=True),
        sa.Column("ai_task_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_daily_reviews_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_reviews")),
        sa.UniqueConstraint("user_id", "date", name="uq_daily_reviews_user_date"),
    )
    op.create_index("ix_daily_reviews_user_id", "daily_reviews", ["user_id"])

    # --- okrs ---
    op.create_table(
        "okrs",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", UUID(as_uuid=True), nullable=True),
        sa.Column("type", okrtype, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("progress", sa.Integer(), server_default="0"),
        sa.Column("status", okrstatus, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_okrs_user_id_users")),
        sa.ForeignKeyConstraint(["parent_id"], ["okrs.id"], name=op.f("fk_okrs_parent_id_okrs")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_okrs")),
    )
    op.create_index("ix_okrs_user_id", "okrs", ["user_id"])

    # --- task_okr_links ---
    op.create_table(
        "task_okr_links",
        sa.Column("task_id", UUID(as_uuid=True), nullable=False),
        sa.Column("okr_id", UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name=op.f("fk_task_okr_links_task_id_tasks"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["okr_id"], ["okrs.id"], name=op.f("fk_task_okr_links_okr_id_okrs"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("task_id", "okr_id", name=op.f("pk_task_okr_links")),
    )

    # --- habits ---
    op.create_table(
        "habits",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("icon", sa.String(10), server_default="✅"),
        sa.Column("color", sa.String(20), server_default="#10b981"),
        sa.Column("frequency", habitfrequency, server_default="daily"),
        sa.Column("target_count", sa.Integer(), server_default="1"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_habits_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_habits")),
    )
    op.create_index("ix_habits_user_id", "habits", ["user_id"])

    # --- habit_records ---
    op.create_table(
        "habit_records",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("habit_id", UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), server_default="true"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["habit_id"], ["habits.id"], name=op.f("fk_habit_records_habit_id_habits"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_habit_records")),
        sa.UniqueConstraint("habit_id", "date", name="uq_habit_record_date"),
    )
    op.create_index("ix_habit_records_habit_id", "habit_records", ["habit_id"])

    # --- pomodoro_sessions ---
    op.create_table(
        "pomodoro_sessions",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", UUID(as_uuid=True), nullable=True),
        sa.Column("duration_min", sa.Integer(), server_default="25"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("interrupted", sa.Boolean(), server_default="false"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_pomodoro_sessions_user_id_users")),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], name=op.f("fk_pomodoro_sessions_task_id_tasks")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pomodoro_sessions")),
    )
    op.create_index("ix_pomodoro_sessions_user_id", "pomodoro_sessions", ["user_id"])

    # --- ai_summaries ---
    op.create_table(
        "ai_summaries",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("type", summarytype, nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("pushed_feishu", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_ai_summaries_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_summaries")),
        sa.UniqueConstraint("user_id", "type", "period_start", name="uq_ai_summaries_user_type_period"),
    )
    op.create_index("ix_ai_summaries_user_id", "ai_summaries", ["user_id"])

    # --- feishu_configs ---
    op.create_table(
        "feishu_configs",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("webhook_url", sa.String(500), nullable=True),
        sa.Column("push_weekly", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("push_monthly", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("push_hour", sa.Integer(), nullable=False, server_default="9"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_feishu_configs_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feishu_configs")),
        sa.UniqueConstraint("user_id", name="uq_feishu_configs_user_id"),
    )
    op.create_index("ix_feishu_configs_user_id", "feishu_configs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_feishu_configs_user_id", table_name="feishu_configs")
    op.drop_table("feishu_configs")

    op.drop_index("ix_ai_summaries_user_id", table_name="ai_summaries")
    op.drop_table("ai_summaries")

    op.drop_index("ix_pomodoro_sessions_user_id", table_name="pomodoro_sessions")
    op.drop_table("pomodoro_sessions")

    op.drop_index("ix_habit_records_habit_id", table_name="habit_records")
    op.drop_table("habit_records")

    op.drop_index("ix_habits_user_id", table_name="habits")
    op.drop_table("habits")

    op.drop_table("task_okr_links")

    op.drop_index("ix_okrs_user_id", table_name="okrs")
    op.drop_table("okrs")

    op.drop_index("ix_daily_reviews_user_id", table_name="daily_reviews")
    op.drop_table("daily_reviews")

    op.drop_table("ai_providers")

    op.execute("DROP TYPE IF EXISTS summarytype;")
    op.execute("DROP TYPE IF EXISTS habitfrequency;")
    op.execute("DROP TYPE IF EXISTS okrstatus;")
    op.execute("DROP TYPE IF EXISTS okrtype;")
