import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.memos.models import Memo
from app.memos.schemas import MemoConvert, MemoCreate, MemoUpdate
from app.tasks_domain.models import Task, TaskStatus

TASK_TITLE_MAX = 500


async def list_memos(db: AsyncSession, user_id: uuid.UUID, status: str = "open") -> list[Memo]:
    stmt = select(Memo).where(Memo.user_id == user_id).order_by(Memo.created_at.desc())
    if status == "open":
        stmt = stmt.where(Memo.is_done.is_(False))
    elif status == "done":
        stmt = stmt.where(Memo.is_done.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_memo(db: AsyncSession, memo_id: uuid.UUID, user_id: uuid.UUID) -> Memo | None:
    result = await db.execute(select(Memo).where(Memo.id == memo_id, Memo.user_id == user_id))
    return result.scalar_one_or_none()


async def create_memo(db: AsyncSession, user_id: uuid.UUID, data: MemoCreate) -> Memo:
    memo = Memo(user_id=user_id, content=data.content)
    db.add(memo)
    await db.commit()
    await db.refresh(memo)
    return memo


async def update_memo(db: AsyncSession, memo: Memo, data: MemoUpdate) -> Memo:
    update_data = data.model_dump(exclude_unset=True)
    if "is_done" in update_data:
        if update_data["is_done"] and memo.done_at is None:
            update_data["done_at"] = datetime.now(timezone.utc)
        elif not update_data["is_done"]:
            update_data["done_at"] = None
    for key, value in update_data.items():
        setattr(memo, key, value)
    await db.commit()
    await db.refresh(memo)
    return memo


async def delete_memo(db: AsyncSession, memo: Memo) -> None:
    await db.delete(memo)
    await db.commit()


async def convert_to_task(db: AsyncSession, memo: Memo, data: MemoConvert) -> tuple[Memo, Task]:
    task = Task(
        user_id=memo.user_id,
        title=memo.content[:TASK_TITLE_MAX],
        quadrant=data.quadrant,
        status=TaskStatus.todo,
        due_date=data.due_date,
    )
    db.add(task)
    await db.flush()
    memo.is_done = True
    memo.done_at = datetime.now(timezone.utc)
    memo.task_id = task.id
    await db.commit()
    await db.refresh(memo)
    await db.refresh(task)
    return memo, task
