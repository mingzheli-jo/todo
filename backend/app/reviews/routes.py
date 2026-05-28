import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.celery_tasks.ai_tasks import process_daily_review
from app.reviews.schemas import ReviewCreate, ReviewOut, ReviewUpdate
from app.reviews import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[ReviewOut])
async def list_reviews(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    reviews = await service.list_reviews(db, user_id, start_date, end_date)
    return [ReviewOut.model_validate(r) for r in reviews]


@router.get("/today", response_model=ReviewOut)
async def get_today_review(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    review = await service.get_or_create_today_review(db, user_id)
    return ReviewOut.model_validate(review)


@router.get("/{review_id}", response_model=ReviewOut)
async def get_review(
    review_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    review = await service.get_review(db, review_id, user_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return ReviewOut.model_validate(review)


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def upsert_review(
    body: ReviewCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    review = await service.upsert_review(db, user_id, body)
    return ReviewOut.model_validate(review)


@router.patch("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: uuid.UUID,
    body: ReviewUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    review = await service.get_review(db, review_id, user_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    updated = await service.update_review(db, review, body)
    return ReviewOut.model_validate(updated)


@router.post("/{review_id}/ai-process")
async def trigger_ai_process(
    review_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    review = await service.get_review(db, review_id, user_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")

    task = process_daily_review.delay(str(review_id))
    review.ai_task_id = task.id
    await db.commit()
    return {"task_id": task.id}


@router.get("/{review_id}/ai-status")
async def get_ai_status(
    review_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    review = await service.get_review(db, review_id, user_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.ai_structured is not None or review.ai_polished is not None:
        return {
            "status": "ready",
            "ai_structured": review.ai_structured,
            "ai_polished": review.ai_polished,
        }
    if review.ai_task_id is not None:
        return {"status": "processing", "ai_structured": None, "ai_polished": None}
    return {"status": "idle", "ai_structured": None, "ai_polished": None}
