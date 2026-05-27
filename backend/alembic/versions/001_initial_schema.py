"""initial schema: users, tasks, projects, pdca_logs

Revision ID: 001
Revises:
Create Date: 2026-05-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), server_default=""),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("settings", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("username", name=op.f("uq_users_username")),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(20), server_default="#6366f1"),
        sa.Column("icon", sa.String(10), server_default="📁"),
        sa.Column("pdca_phase", sa.Enum("plan", "do", "check", "act", name="pdcaphase"), server_default="plan"),
        sa.Column("pdca_cycle", sa.Integer(), server_default="1"),
        sa.Column("is_archived", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_projects_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
    )

    op.create_table(
        "tasks",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quadrant", sa.Enum("urgent_important", "important", "urgent", "neither", name="quadrant"), server_default="neither"),
        sa.Column("status", sa.Enum("todo", "in_progress", "done", "cancelled", name="taskstatus"), server_default="todo"),
        sa.Column("priority", sa.Integer(), server_default="0"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_tasks_user_id_users")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_tasks_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tasks")),
    )

    op.create_table(
        "pdca_logs",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("cycle", sa.Integer(), nullable=False),
        sa.Column("phase", sa.Enum("plan", "do", "check", "act", name="pdcaphase", create_type=False)),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_pdca_logs_project_id_projects")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pdca_logs")),
    )


def downgrade() -> None:
    op.drop_table("pdca_logs")
    op.drop_table("tasks")
    op.drop_table("projects")
    op.drop_table("users")
    sa.Enum("pdcaphase", name="pdcaphase").drop(op.get_bind())
    sa.Enum("quadrant", name="quadrant").drop(op.get_bind())
    sa.Enum("taskstatus", name="taskstatus").drop(op.get_bind())
