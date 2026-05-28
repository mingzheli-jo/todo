import uuid
from datetime import date as DateType, datetime
from sqlalchemy import select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from app.habits.models import Habit, HabitRecord
from app.habits.schemas import HabitCreate, HabitUpdate, CheckInBody, HabitTodayStatus, HabitOut, HabitRecordOut


async def list_habits(db: AsyncSession, user_id: uuid.UUID, include_inactive: bool = False) -> list[Habit]:
    stmt = select(Habit).where(Habit.user_id == user_id).order_by(Habit.created_at)
    if not include_inactive:
        stmt = stmt.where(Habit.is_active == True)  # noqa: E712
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_habit(db: AsyncSession, habit_id: uuid.UUID, user_id: uuid.UUID) -> Habit | None:
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id))
    return result.scalar_one_or_none()


async def create_habit(db: AsyncSession, user_id: uuid.UUID, data: HabitCreate) -> Habit:
    habit = Habit(user_id=user_id, **data.model_dump())
    db.add(habit)
    await db.commit()
    await db.refresh(habit)
    return habit


async def update_habit(db: AsyncSession, habit: Habit, data: HabitUpdate) -> Habit:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(habit, key, value)
    await db.commit()
    await db.refresh(habit)
    return habit


async def delete_habit(db: AsyncSession, habit: Habit) -> None:
    # Check if records exist — soft delete if so, hard delete otherwise
    result = await db.execute(select(HabitRecord).where(HabitRecord.habit_id == habit.id).limit(1))
    has_records = result.scalar_one_or_none() is not None
    if has_records:
        habit.is_active = False
        await db.commit()
    else:
        await db.delete(habit)
        await db.commit()


async def record_habit(db: AsyncSession, habit_id: uuid.UUID, body: CheckInBody) -> HabitRecord:
    record_date = body.date or DateType.today()
    # Upsert: check existing record
    result = await db.execute(
        select(HabitRecord).where(HabitRecord.habit_id == habit_id, HabitRecord.date == record_date)
    )
    record = result.scalar_one_or_none()
    if record is None:
        record = HabitRecord(habit_id=habit_id, date=record_date, completed=body.completed, note=body.note)
        db.add(record)
    else:
        record.completed = body.completed
        record.note = body.note
    await db.commit()
    await db.refresh(record)
    return record


async def get_records_in_range(
    db: AsyncSession, habit_id: uuid.UUID, start_date: DateType, end_date: DateType
) -> list[HabitRecord]:
    result = await db.execute(
        select(HabitRecord).where(
            HabitRecord.habit_id == habit_id,
            HabitRecord.date >= start_date,
            HabitRecord.date <= end_date,
        ).order_by(HabitRecord.date)
    )
    return list(result.scalars().all())


async def get_today_status(db: AsyncSession, user_id: uuid.UUID) -> list[HabitTodayStatus]:
    today = DateType.today()
    habits = await list_habits(db, user_id, include_inactive=False)
    statuses: list[HabitTodayStatus] = []
    for habit in habits:
        result = await db.execute(
            select(HabitRecord).where(HabitRecord.habit_id == habit.id, HabitRecord.date == today)
        )
        record = result.scalar_one_or_none()
        statuses.append(
            HabitTodayStatus(
                habit=HabitOut.model_validate(habit),
                completed_today=record is not None and record.completed,
                record=HabitRecordOut.model_validate(record) if record is not None else None,
            )
        )
    return statuses
