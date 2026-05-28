import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.summaries.models import AISummary, SummaryType
from app.tasks_domain.models import Task, TaskStatus, Quadrant
from app.reviews.models import DailyReview
from app.habits.models import Habit, HabitRecord
from app.pomodoro.models import PomodoroSession
from app.okrs.models import OKR, OKRStatus, OKRType


async def aggregate_metrics(
    db: AsyncSession,
    user_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> dict:
    # Tasks: completed in range
    task_result = await db.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.status == TaskStatus.done,
            Task.completed_at >= datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc),
            Task.completed_at < datetime(end_date.year, end_date.month, end_date.day + 1, tzinfo=timezone.utc),
        )
    )
    completed_tasks = list(task_result.scalars().all())

    completed_by_quadrant: dict[str, int] = {q.value: 0 for q in Quadrant}
    completed_by_project_map: dict[str | None, int] = {}
    for t in completed_tasks:
        completed_by_quadrant[t.quadrant.value] += 1
        pid = str(t.project_id) if t.project_id else None
        completed_by_project_map[pid] = completed_by_project_map.get(pid, 0) + 1

    tasks_metrics = {
        "completed_total": len(completed_tasks),
        "completed_by_quadrant": completed_by_quadrant,
        "completed_by_project": [
            {"project_id": pid, "count": cnt}
            for pid, cnt in completed_by_project_map.items()
        ],
    }

    # Reviews: ai_structured items in range
    review_result = await db.execute(
        select(DailyReview).where(
            DailyReview.user_id == user_id,
            DailyReview.date >= start_date,
            DailyReview.date <= end_date,
            DailyReview.ai_structured.is_not(None),
        )
    )
    reviews = list(review_result.scalars().all())
    ai_structured_aggregated = [r.ai_structured for r in reviews if r.ai_structured]
    reviews_metrics = {
        "count": len(reviews),
        "ai_structured_aggregated": ai_structured_aggregated,
    }

    # Habits: completion rate in range
    # Get all active habits for user
    habit_result = await db.execute(
        select(Habit).where(Habit.user_id == user_id, Habit.is_active == True)  # noqa: E712
    )
    habits = list(habit_result.scalars().all())

    total_check_ins = 0
    best_streak_habit = None
    best_streak = 0

    if habits:
        habit_ids = [h.id for h in habits]
        record_result = await db.execute(
            select(HabitRecord).where(
                HabitRecord.habit_id.in_(habit_ids),
                HabitRecord.date >= start_date,
                HabitRecord.date <= end_date,
                HabitRecord.completed == True,  # noqa: E712
            )
        )
        records = list(record_result.scalars().all())
        total_check_ins = len(records)

        # Find best streak habit by check-in count
        habit_checkin_count: dict[uuid.UUID, int] = {}
        for rec in records:
            habit_checkin_count[rec.habit_id] = habit_checkin_count.get(rec.habit_id, 0) + 1
        if habit_checkin_count:
            best_habit_id = max(habit_checkin_count, key=lambda k: habit_checkin_count[k])
            best_streak = habit_checkin_count[best_habit_id]
            for h in habits:
                if h.id == best_habit_id:
                    best_streak_habit = h.name
                    break

        # Completion rate: completed / (habits * days_in_range)
        days = (end_date - start_date).days + 1
        possible = len(habits) * days
        completion_rate = round(total_check_ins / possible, 3) if possible > 0 else 0.0
    else:
        completion_rate = 0.0

    habits_metrics = {
        "completion_rate": completion_rate,
        "best_streak_habit": best_streak_habit,
        "total_check_ins": total_check_ins,
    }

    # Pomodoro stats
    pomo_result = await db.execute(
        select(PomodoroSession).where(
            PomodoroSession.user_id == user_id,
            PomodoroSession.started_at >= datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc),
            PomodoroSession.started_at < datetime(end_date.year, end_date.month, end_date.day + 1, tzinfo=timezone.utc),
        )
    )
    pomo_sessions = list(pomo_result.scalars().all())
    completed_pomo = [s for s in pomo_sessions if not s.interrupted and s.completed_at is not None]
    total_minutes = sum(s.duration_min for s in completed_pomo)

    pomodoro_metrics = {
        "total_sessions": len(pomo_sessions),
        "completed_sessions": len(completed_pomo),
        "total_minutes": total_minutes,
    }

    # OKR progress
    okr_result = await db.execute(
        select(OKR).where(
            OKR.user_id == user_id,
            OKR.type == OKRType.key_result,
        )
    )
    okrs = list(okr_result.scalars().all())
    completed_okrs = [o for o in okrs if o.status == OKRStatus.completed]
    avg_progress = round(sum(o.progress for o in okrs) / len(okrs), 1) if okrs else 0.0

    okrs_metrics = {
        "avg_progress": avg_progress,
        "completed_count": len(completed_okrs),
    }

    return {
        "tasks": tasks_metrics,
        "reviews": reviews_metrics,
        "habits": habits_metrics,
        "pomodoro": pomodoro_metrics,
        "okrs": okrs_metrics,
    }


async def list_summaries(
    db: AsyncSession,
    user_id: uuid.UUID,
    summary_type: str | None = None,
    limit: int = 20,
) -> list[AISummary]:
    stmt = (
        select(AISummary)
        .where(AISummary.user_id == user_id)
        .order_by(AISummary.period_start.desc())
        .limit(limit)
    )
    if summary_type is not None:
        stmt = stmt.where(AISummary.type == summary_type)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_summary(
    db: AsyncSession,
    summary_id: uuid.UUID,
    user_id: uuid.UUID,
) -> AISummary | None:
    result = await db.execute(
        select(AISummary).where(AISummary.id == summary_id, AISummary.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    summary_type: str,
    start_date: date,
    end_date: date,
    content: str,
    metrics: dict | None,
) -> AISummary:
    # Upsert by (user_id, type, period_start)
    existing_result = await db.execute(
        select(AISummary).where(
            AISummary.user_id == user_id,
            AISummary.type == summary_type,
            AISummary.period_start == start_date,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        existing.period_end = end_date
        existing.content = content
        existing.metrics = metrics
        existing.pushed_feishu = False
        await db.commit()
        await db.refresh(existing)
        return existing

    summary = AISummary(
        user_id=user_id,
        type=summary_type,
        period_start=start_date,
        period_end=end_date,
        content=content,
        metrics=metrics,
    )
    db.add(summary)
    await db.commit()
    await db.refresh(summary)
    return summary


async def mark_pushed(db: AsyncSession, summary_id: uuid.UUID) -> None:
    result = await db.execute(select(AISummary).where(AISummary.id == summary_id))
    summary = result.scalar_one_or_none()
    if summary is not None:
        summary.pushed_feishu = True
        await db.commit()
