from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.tasks_domain.models import Task, TaskStatus

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
