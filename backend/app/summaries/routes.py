import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.celery_tasks.summary_tasks import generate_summary_task
from app.summaries.schemas import SummaryGenerateRequest, SummaryOut
from app.summaries import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[SummaryOut])
async def list_summaries(
    type: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    summaries = await service.list_summaries(db, user_id, type, limit)
    return [SummaryOut.model_validate(s) for s in summaries]


@router.get("/{summary_id}", response_model=SummaryOut)
async def get_summary(
    summary_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    summary = await service.get_summary(db, summary_id, user_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Summary not found")
    return SummaryOut.model_validate(summary)


@router.post("/generate")
async def generate_summary(
    body: SummaryGenerateRequest,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    task = generate_summary_task.delay(
        str(user_id),
        body.type,
        body.period_start.isoformat(),
        body.period_end.isoformat(),
    )
    return {"task_id": task.id}


@router.post("/{summary_id}/push-feishu")
async def push_to_feishu(
    summary_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    summary = await service.get_summary(db, summary_id, user_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Summary not found")

    from app.feishu import service as feishu_service
    config = await feishu_service.get_config(db, user_id)
    if config is None or not config.enabled or not config.webhook_url:
        raise HTTPException(status_code=400, detail="飞书推送未配置或已禁用")

    success = await feishu_service.push_summary_to_feishu(config.webhook_url, summary)
    if success:
        await service.mark_pushed(db, summary_id)
        return {"success": True}
    raise HTTPException(status_code=502, detail="飞书推送失败")
