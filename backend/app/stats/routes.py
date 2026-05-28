from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.habits.models import Habit, HabitRecord
from app.okrs.models import OKR, OKRStatus, OKRType
from app.pomodoro.models import PomodoroSession
from app.projects.models import Project
from app.tasks_domain.models import Quadrant, Task, TaskStatus

router = APIRouter()


@router.get("/today")
async def today_stats(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        return {"completed": 0, "pending": 0, "total": 0}

    uid = user.id
    base = select(func.count()).select_from(Task).where(
        Task.user_id == uid,
        Task.status != TaskStatus.cancelled,
    )

    total = (await db.execute(base)).scalar() or 0
    completed = (
        await db.execute(base.where(Task.status == TaskStatus.done))
    ).scalar() or 0
    pending = total - completed

    return {"completed": completed, "pending": pending, "total": total}


@router.get("/overview")
async def stats_overview(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        return _empty_overview()

    uid = user.id

    # --- Task aggregations ---
    total_tasks = (
        await db.execute(
            select(func.count()).select_from(Task).where(
                Task.user_id == uid,
                Task.status != TaskStatus.cancelled,
            )
        )
    ).scalar() or 0

    completed_tasks = (
        await db.execute(
            select(func.count()).select_from(Task).where(
                Task.user_id == uid,
                Task.status == TaskStatus.done,
            )
        )
    ).scalar() or 0

    completion_rate = round(completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    # Last 7 days completed tasks
    today = date.today()
    completed_last_7: list[dict] = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, time.min, tzinfo=timezone.utc)
        day_end = datetime.combine(day, time.max, tzinfo=timezone.utc)
        cnt = (
            await db.execute(
                select(func.count()).select_from(Task).where(
                    Task.user_id == uid,
                    Task.status == TaskStatus.done,
                    Task.completed_at >= day_start,
                    Task.completed_at <= day_end,
                )
            )
        ).scalar() or 0
        completed_last_7.append({"date": str(day), "count": cnt})

    # Active tasks by quadrant
    quadrant_counts: dict[str, int] = {}
    for q in [Quadrant.urgent_important, Quadrant.important, Quadrant.urgent, Quadrant.neither]:
        cnt = (
            await db.execute(
                select(func.count()).select_from(Task).where(
                    Task.user_id == uid,
                    Task.quadrant == q,
                    Task.status != TaskStatus.cancelled,
                    Task.status != TaskStatus.done,
                )
            )
        ).scalar() or 0
        quadrant_counts[q.value] = cnt

    # --- Pomodoro total minutes ---
    total_minutes = (
        await db.execute(
            select(func.coalesce(func.sum(PomodoroSession.duration_min), 0)).where(
                PomodoroSession.user_id == uid,
                PomodoroSession.completed_at.isnot(None),
                PomodoroSession.interrupted.is_(False),
            )
        )
    ).scalar() or 0

    # --- Projects (non-archived) ---
    projects_result = await db.execute(
        select(Project).where(
            Project.user_id == uid,
            Project.is_archived.is_(False),
        ).order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()
    projects_data = [
        {
            "id": str(p.id),
            "name": p.name,
            "icon": p.icon,
            "pdca_phase": p.pdca_phase.value,
            "pdca_cycle": p.pdca_cycle,
        }
        for p in projects
    ]

    # --- OKR top 3 active objectives ---
    okrs_result = await db.execute(
        select(OKR).where(
            OKR.user_id == uid,
            OKR.type == OKRType.objective,
            OKR.status == OKRStatus.active,
        ).order_by(OKR.created_at.desc()).limit(3)
    )
    okrs = okrs_result.scalars().all()
    okrs_data = [
        {"id": str(o.id), "title": o.title, "progress": o.progress}
        for o in okrs
    ]

    # --- Habits weekly completion rate ---
    week_start = today - timedelta(days=today.weekday())
    habits_result = await db.execute(
        select(Habit).where(
            Habit.user_id == uid,
            Habit.is_active.is_(True),
        )
    )
    habits = habits_result.scalars().all()
    habits_data = []
    for habit in habits:
        records_result = await db.execute(
            select(func.count()).select_from(HabitRecord).where(
                HabitRecord.habit_id == habit.id,
                HabitRecord.date >= week_start,
                HabitRecord.date <= today,
                HabitRecord.completed.is_(True),
            )
        )
        checked_days = records_result.scalar() or 0
        days_in_week = today.weekday() + 1  # Mon=0 so +1 gives days passed
        rate = round(checked_days / days_in_week * 100) if days_in_week > 0 else 0
        habits_data.append(
            {"id": str(habit.id), "name": habit.name, "icon": habit.icon, "completion_rate": rate}
        )

    return {
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "completion_rate": completion_rate,
            "completed_last_7_days": completed_last_7,
            "by_quadrant_active": quadrant_counts,
        },
        "pomodoro": {
            "total_minutes_all_time": int(total_minutes),
        },
        "projects": projects_data,
        "okrs_top": okrs_data,
        "habits_weekly": habits_data,
    }


def _empty_overview() -> dict:
    today = date.today()
    return {
        "tasks": {
            "total": 0,
            "completed": 0,
            "completion_rate": 0,
            "completed_last_7_days": [
                {"date": str(today - timedelta(days=i)), "count": 0}
                for i in range(6, -1, -1)
            ],
            "by_quadrant_active": {
                "urgent_important": 0,
                "important": 0,
                "urgent": 0,
                "neither": 0,
            },
        },
        "pomodoro": {"total_minutes_all_time": 0},
        "projects": [],
        "okrs_top": [],
        "habits_weekly": [],
    }
