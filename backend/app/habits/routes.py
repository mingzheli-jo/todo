import uuid
from datetime import date as DateType
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.habits.schemas import CheckInBody, HabitCreate, HabitOut, HabitRecordOut, HabitTodayStatus, HabitUpdate
from app.habits import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[HabitOut])
async def list_habits(
    include_inactive: bool = Query(False),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habits = await service.list_habits(db, user_id, include_inactive=include_inactive)
    return [HabitOut.model_validate(h) for h in habits]


@router.post("", response_model=HabitOut, status_code=status.HTTP_201_CREATED)
async def create_habit(
    body: HabitCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habit = await service.create_habit(db, user_id, body)
    return HabitOut.model_validate(habit)


@router.get("/today", response_model=list[HabitTodayStatus])
async def today_habits(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    return await service.get_today_status(db, user_id)


@router.get("/{habit_id}", response_model=HabitOut)
async def get_habit(
    habit_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habit = await service.get_habit(db, habit_id, user_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    return HabitOut.model_validate(habit)


@router.patch("/{habit_id}", response_model=HabitOut)
async def update_habit(
    habit_id: uuid.UUID,
    body: HabitUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habit = await service.get_habit(db, habit_id, user_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    updated = await service.update_habit(db, habit, body)
    return HabitOut.model_validate(updated)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habit = await service.get_habit(db, habit_id, user_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    await service.delete_habit(db, habit)


@router.post("/{habit_id}/check-in", response_model=HabitRecordOut, status_code=status.HTTP_200_OK)
async def check_in(
    habit_id: uuid.UUID,
    body: CheckInBody,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habit = await service.get_habit(db, habit_id, user_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    record = await service.record_habit(db, habit_id, body)
    return HabitRecordOut.model_validate(record)


@router.get("/{habit_id}/records", response_model=list[HabitRecordOut])
async def get_records(
    habit_id: uuid.UUID,
    start_date: DateType = Query(...),
    end_date: DateType = Query(...),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    habit = await service.get_habit(db, habit_id, user_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    records = await service.get_records_in_range(db, habit_id, start_date, end_date)
    return [HabitRecordOut.model_validate(r) for r in records]
