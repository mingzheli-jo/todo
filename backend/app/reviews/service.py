import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.reviews.models import DailyReview
from app.reviews.schemas import ReviewCreate, ReviewUpdate


async def list_reviews(
    db: AsyncSession,
    user_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[DailyReview]:
    stmt = select(DailyReview).where(DailyReview.user_id == user_id).order_by(DailyReview.date.desc())
    if start_date is not None:
        stmt = stmt.where(DailyReview.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(DailyReview.date <= end_date)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_review(db: AsyncSession, review_id: uuid.UUID, user_id: uuid.UUID) -> DailyReview | None:
    result = await db.execute(
        select(DailyReview).where(DailyReview.id == review_id, DailyReview.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_review_by_date(db: AsyncSession, user_id: uuid.UUID, review_date: date) -> DailyReview | None:
    result = await db.execute(
        select(DailyReview).where(DailyReview.user_id == user_id, DailyReview.date == review_date)
    )
    return result.scalar_one_or_none()


async def get_or_create_today_review(db: AsyncSession, user_id: uuid.UUID) -> DailyReview:
    today = datetime.now(timezone.utc).date()
    review = await get_review_by_date(db, user_id, today)
    if review is None:
        review = DailyReview(user_id=user_id, date=today, raw_content="")
        db.add(review)
        await db.commit()
        await db.refresh(review)
    return review


async def upsert_review(db: AsyncSession, user_id: uuid.UUID, data: ReviewCreate) -> DailyReview:
    existing = await get_review_by_date(db, user_id, data.date)
    if existing is not None:
        update_data = data.model_dump(exclude={"date"}, exclude_unset=False)
        for key, value in update_data.items():
            setattr(existing, key, value)
        await db.commit()
        await db.refresh(existing)
        return existing
    review = DailyReview(user_id=user_id, **data.model_dump())
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


async def update_review(db: AsyncSession, review: DailyReview, data: ReviewUpdate) -> DailyReview:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(review, key, value)
    await db.commit()
    await db.refresh(review)
    return review
