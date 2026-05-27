import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.tasks_domain.models import Quadrant, TaskStatus
from app.tasks_domain.schemas import TaskCreate, TaskOut, TaskUpdate
from app.tasks_domain import service

router = APIRouter()

async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id

@router.get("", response_model=list[TaskOut])
async def list_tasks(quadrant: Quadrant | None = Query(None), task_status: TaskStatus | None = Query(None, alias="status"), username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    tasks = await service.list_tasks(db, user_id, quadrant=quadrant, status=task_status)
    return [TaskOut.model_validate(t) for t in tasks]

@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(body: TaskCreate, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    task = await service.create_task(db, user_id, body)
    return TaskOut.model_validate(task)

@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: uuid.UUID, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    task = await service.get_task(db, task_id, user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskOut.model_validate(task)

@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: uuid.UUID, body: TaskUpdate, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    task = await service.get_task(db, task_id, user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await service.update_task(db, task, body)
    return TaskOut.model_validate(updated)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: uuid.UUID, username: str = Depends(get_current_username), db: AsyncSession = Depends(get_db)):
    user_id = await _get_user_id(username, db)
    task = await service.get_task(db, task_id, user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await service.delete_task(db, task)
