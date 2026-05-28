import uuid
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.okrs.models import OKR, OKRType, OKRStatus, task_okr_link
from app.okrs.schemas import OKRCreate, OKRUpdate


async def list_okrs(
    db: AsyncSession,
    user_id: uuid.UUID,
    period: str | None = None,
    status: OKRStatus | None = None,
) -> list[OKR]:
    stmt = select(OKR).where(OKR.user_id == user_id).order_by(OKR.created_at)
    if period:
        stmt = stmt.where(OKR.period == period)
    if status:
        stmt = stmt.where(OKR.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_okr(db: AsyncSession, okr_id: uuid.UUID, user_id: uuid.UUID) -> OKR | None:
    result = await db.execute(select(OKR).where(OKR.id == okr_id, OKR.user_id == user_id))
    return result.scalar_one_or_none()


async def get_okr_with_children(db: AsyncSession, okr_id: uuid.UUID, user_id: uuid.UUID) -> OKR | None:
    okr = await get_okr(db, okr_id, user_id)
    if okr is None:
        return None
    if okr.type == OKRType.objective:
        krs_result = await db.execute(
            select(OKR).where(OKR.parent_id == okr_id).order_by(OKR.created_at)
        )
        okr.__dict__["_children"] = list(krs_result.scalars().all())
    return okr


async def create_okr(db: AsyncSession, user_id: uuid.UUID, data: OKRCreate) -> OKR:
    okr = OKR(user_id=user_id, **data.model_dump())
    db.add(okr)
    await db.commit()
    await db.refresh(okr)
    return okr


async def update_okr(db: AsyncSession, okr: OKR, data: OKRUpdate) -> OKR:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(okr, key, value)
    await db.commit()
    await db.refresh(okr)
    # If this is a key result, auto-update parent objective progress
    if okr.type == OKRType.key_result and okr.parent_id is not None:
        await update_objective_progress_from_krs(db, okr.parent_id)
    return okr


async def delete_okr(db: AsyncSession, okr: OKR) -> None:
    await db.delete(okr)
    await db.commit()


async def update_objective_progress_from_krs(db: AsyncSession, objective_id: uuid.UUID) -> None:
    result = await db.execute(
        select(func.avg(OKR.progress)).where(OKR.parent_id == objective_id)
    )
    avg = result.scalar_one_or_none()
    if avg is None:
        return
    obj_result = await db.execute(select(OKR).where(OKR.id == objective_id))
    obj = obj_result.scalar_one_or_none()
    if obj is not None:
        obj.progress = int(round(avg))
        await db.commit()


async def link_task_to_okr(db: AsyncSession, task_id: uuid.UUID, okr_id: uuid.UUID) -> None:
    # Check if link already exists
    result = await db.execute(
        select(task_okr_link).where(
            task_okr_link.c.task_id == task_id,
            task_okr_link.c.okr_id == okr_id,
        )
    )
    if result.first() is not None:
        return
    await db.execute(task_okr_link.insert().values(task_id=task_id, okr_id=okr_id))
    await db.commit()


async def unlink_task_from_okr(db: AsyncSession, task_id: uuid.UUID, okr_id: uuid.UUID) -> None:
    await db.execute(
        delete(task_okr_link).where(
            task_okr_link.c.task_id == task_id,
            task_okr_link.c.okr_id == okr_id,
        )
    )
    await db.commit()


async def list_okrs_for_task(db: AsyncSession, task_id: uuid.UUID) -> list[OKR]:
    result = await db.execute(
        select(OKR).join(task_okr_link, OKR.id == task_okr_link.c.okr_id).where(
            task_okr_link.c.task_id == task_id
        )
    )
    return list(result.scalars().all())
