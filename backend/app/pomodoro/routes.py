import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.pomodoro.schemas import PomodoroSessionOut, PomodoroTodayStats, SessionComplete, SessionStart
from app.pomodoro import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.post("/start", response_model=PomodoroSessionOut, status_code=status.HTTP_201_CREATED)
async def start_session(
    body: SessionStart,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    session = await service.start_session(db, user_id, body)
    return PomodoroSessionOut.model_validate(session)


@router.post("/{session_id}/complete", response_model=PomodoroSessionOut)
async def complete_session(
    session_id: uuid.UUID,
    body: SessionComplete,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    session = await service.get_session(db, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    updated = await service.complete_session(db, session, body.interrupted)
    return PomodoroSessionOut.model_validate(updated)


@router.get("/current", response_model=PomodoroSessionOut | None)
async def current_session(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    session = await service.get_current_session(db, user_id)
    if session is None:
        return None
    return PomodoroSessionOut.model_validate(session)


@router.get("/today", response_model=PomodoroTodayStats)
async def today_stats(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    return await service.today_stats(db, user_id)


@router.get("/sessions", response_model=list[PomodoroSessionOut])
async def list_sessions(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    sessions = await service.list_sessions(db, user_id, start_date=start_date, end_date=end_date)
    return [PomodoroSessionOut.model_validate(s) for s in sessions]
