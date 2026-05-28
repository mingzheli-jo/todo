import uuid
from datetime import date, datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.pomodoro.models import PomodoroSession
from app.pomodoro.schemas import PomodoroSessionOut, PomodoroTodayStats, SessionStart


async def start_session(db: AsyncSession, user_id: uuid.UUID, data: SessionStart) -> PomodoroSession:
    session = PomodoroSession(
        user_id=user_id,
        task_id=data.task_id,
        duration_min=data.duration_min,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def complete_session(db: AsyncSession, session: PomodoroSession, interrupted: bool) -> PomodoroSession:
    session.completed_at = datetime.now(timezone.utc)
    session.interrupted = interrupted
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID) -> PomodoroSession | None:
    result = await db.execute(
        select(PomodoroSession).where(
            PomodoroSession.id == session_id,
            PomodoroSession.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_current_session(db: AsyncSession, user_id: uuid.UUID) -> PomodoroSession | None:
    result = await db.execute(
        select(PomodoroSession).where(
            PomodoroSession.user_id == user_id,
            PomodoroSession.completed_at.is_(None),
        ).order_by(PomodoroSession.started_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def list_sessions(
    db: AsyncSession,
    user_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[PomodoroSession]:
    stmt = select(PomodoroSession).where(PomodoroSession.user_id == user_id).order_by(PomodoroSession.started_at.desc())
    if start_date:
        stmt = stmt.where(func.date(PomodoroSession.started_at) >= start_date)
    if end_date:
        stmt = stmt.where(func.date(PomodoroSession.started_at) <= end_date)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def today_stats(db: AsyncSession, user_id: uuid.UUID) -> PomodoroTodayStats:
    today = date.today()
    sessions = await list_sessions(db, user_id, start_date=today, end_date=today)
    completed = [s for s in sessions if s.completed_at is not None and not s.interrupted]
    total_minutes = sum(s.duration_min for s in completed)
    current = await get_current_session(db, user_id)
    return PomodoroTodayStats(
        total_sessions=len(sessions),
        completed_sessions=len(completed),
        total_minutes=total_minutes,
        current_session=PomodoroSessionOut.model_validate(current) if current else None,
    )
