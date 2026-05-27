import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.tasks_domain.models import Quadrant, Task, TaskStatus
from app.tasks_domain.schemas import TaskCreate, TaskUpdate

async def list_tasks(db: AsyncSession, user_id: uuid.UUID, quadrant: Quadrant | None = None, status: TaskStatus | None = None) -> list[Task]:
    stmt = select(Task).where(Task.user_id == user_id).order_by(Task.sort_order, Task.created_at.desc())
    if quadrant is not None:
        stmt = stmt.where(Task.quadrant == quadrant)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_task(db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    return result.scalar_one_or_none()

async def create_task(db: AsyncSession, user_id: uuid.UUID, data: TaskCreate) -> Task:
    task = Task(user_id=user_id, **data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == TaskStatus.done and task.completed_at is None:
        update_data["completed_at"] = datetime.now(timezone.utc)
    for key, value in update_data.items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return task

async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()
