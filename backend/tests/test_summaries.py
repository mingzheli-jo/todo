"""Tests for the summaries module."""
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.summaries import service as summary_service
from app.summaries.models import AISummary
from app.tasks_domain.models import Task, TaskStatus, Quadrant
from app.reviews.models import DailyReview
from app.habits.models import Habit, HabitRecord
from app.pomodoro.models import PomodoroSession
from app.okrs.models import OKR, OKRType, OKRStatus


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── aggregate_metrics ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_aggregate_metrics_tasks(db_session: AsyncSession, seed_admin):
    user_id = seed_admin.id
    today = date.today()
    week_ago = today - timedelta(days=6)

    # Create 3 completed tasks in range
    for q in [Quadrant.urgent_important, Quadrant.important, Quadrant.neither]:
        t = Task(
            user_id=user_id,
            title=f"Task {q.value}",
            quadrant=q,
            status=TaskStatus.done,
            completed_at=datetime.now(timezone.utc),
        )
        db_session.add(t)
    # Create 1 todo task (should not count)
    db_session.add(Task(user_id=user_id, title="Todo task", quadrant=Quadrant.urgent, status=TaskStatus.todo))
    await db_session.commit()

    metrics = await summary_service.aggregate_metrics(db_session, user_id, week_ago, today)

    assert metrics["tasks"]["completed_total"] == 3
    assert metrics["tasks"]["completed_by_quadrant"]["urgent_important"] == 1
    assert metrics["tasks"]["completed_by_quadrant"]["important"] == 1
    assert metrics["tasks"]["completed_by_quadrant"]["neither"] == 1
    assert metrics["tasks"]["completed_by_quadrant"]["urgent"] == 0


@pytest.mark.asyncio
async def test_aggregate_metrics_habits(db_session: AsyncSession, seed_admin):
    user_id = seed_admin.id
    today = date.today()
    yesterday = today - timedelta(days=1)

    habit = Habit(user_id=user_id, name="晨跑", icon="🏃")
    db_session.add(habit)
    await db_session.commit()
    await db_session.refresh(habit)

    # 2 check-ins
    for d in [today, yesterday]:
        db_session.add(HabitRecord(habit_id=habit.id, date=d, completed=True))
    await db_session.commit()

    metrics = await summary_service.aggregate_metrics(db_session, user_id, yesterday, today)

    assert metrics["habits"]["total_check_ins"] == 2
    assert metrics["habits"]["best_streak_habit"] == "晨跑"
    assert metrics["habits"]["completion_rate"] > 0


@pytest.mark.asyncio
async def test_aggregate_metrics_pomodoro(db_session: AsyncSession, seed_admin):
    user_id = seed_admin.id
    today = date.today()
    week_ago = today - timedelta(days=6)

    now = datetime.now(timezone.utc)
    # 2 completed, 1 interrupted
    db_session.add(PomodoroSession(user_id=user_id, duration_min=25, started_at=now, completed_at=now, interrupted=False))
    db_session.add(PomodoroSession(user_id=user_id, duration_min=25, started_at=now, completed_at=now, interrupted=False))
    db_session.add(PomodoroSession(user_id=user_id, duration_min=25, started_at=now, interrupted=True))
    await db_session.commit()

    metrics = await summary_service.aggregate_metrics(db_session, user_id, week_ago, today)

    assert metrics["pomodoro"]["total_sessions"] == 3
    assert metrics["pomodoro"]["completed_sessions"] == 2
    assert metrics["pomodoro"]["total_minutes"] == 50


@pytest.mark.asyncio
async def test_aggregate_metrics_okrs(db_session: AsyncSession, seed_admin):
    user_id = seed_admin.id
    today = date.today()
    week_ago = today - timedelta(days=6)

    db_session.add(OKR(user_id=user_id, type=OKRType.key_result, title="KR1", period="2026-Q2", progress=80, status=OKRStatus.active))
    db_session.add(OKR(user_id=user_id, type=OKRType.key_result, title="KR2", period="2026-Q2", progress=100, status=OKRStatus.completed))
    await db_session.commit()

    metrics = await summary_service.aggregate_metrics(db_session, user_id, week_ago, today)

    assert metrics["okrs"]["avg_progress"] == 90.0
    assert metrics["okrs"]["completed_count"] == 1


# ── API endpoints ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_summaries_empty(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.get("/api/summaries", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_summary_not_found(client: AsyncClient):
    token = await _get_token(client)
    import uuid
    resp = await client.get(f"/api/summaries/{uuid.uuid4()}", headers=_auth(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_generate_summary_mocks_celery(client: AsyncClient):
    token = await _get_token(client)
    today = date.today()
    week_ago = today - timedelta(days=6)

    mock_task = MagicMock()
    mock_task.id = "mock-summary-task-999"

    with patch("app.summaries.routes.generate_summary_task") as mock_gen:
        mock_gen.delay.return_value = mock_task
        resp = await client.post(
            "/api/summaries/generate",
            json={
                "type": "weekly",
                "period_start": week_ago.isoformat(),
                "period_end": today.isoformat(),
            },
            headers=_auth(token),
        )

    assert resp.status_code == 200
    assert resp.json()["task_id"] == "mock-summary-task-999"


@pytest.mark.asyncio
async def test_list_summaries_with_data(client: AsyncClient, db_session: AsyncSession, seed_admin):
    token = await _get_token(client)
    today = date.today()
    week_ago = today - timedelta(days=6)

    # Create a summary directly
    summary = AISummary(
        user_id=seed_admin.id,
        type="weekly",
        period_start=week_ago,
        period_end=today,
        content="Test summary content",
        metrics={"tasks": {"completed_total": 5}},
    )
    db_session.add(summary)
    await db_session.commit()

    resp = await client.get("/api/summaries?type=weekly", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["content"] == "Test summary content"
    assert data[0]["pushed_feishu"] is False


@pytest.mark.asyncio
async def test_get_summary_by_id(client: AsyncClient, db_session: AsyncSession, seed_admin):
    token = await _get_token(client)
    today = date.today()
    week_ago = today - timedelta(days=6)

    summary = AISummary(
        user_id=seed_admin.id,
        type="monthly",
        period_start=week_ago,
        period_end=today,
        content="Monthly content",
        metrics={},
    )
    db_session.add(summary)
    await db_session.commit()
    await db_session.refresh(summary)

    resp = await client.get(f"/api/summaries/{summary.id}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["type"] == "monthly"
