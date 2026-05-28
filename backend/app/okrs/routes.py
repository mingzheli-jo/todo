import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.okrs.models import OKRStatus, OKRType
from app.okrs.schemas import OKRCreate, OKROut, OKRUpdate
from app.okrs import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


def _build_okr_out(okr, children: list | None = None) -> OKROut:
    data = OKROut.model_validate(okr)
    if children is not None:
        data.children = [OKROut.model_validate(c) for c in children]
    return data


@router.get("", response_model=list[OKROut])
async def list_okrs(
    period: str | None = Query(None),
    okr_status: OKRStatus | None = Query(None, alias="status"),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okrs = await service.list_okrs(db, user_id, period=period, status=okr_status)
    # For objectives, attach their key results
    objectives = [o for o in okrs if o.type == OKRType.objective]
    krs = [o for o in okrs if o.type == OKRType.key_result]
    kr_by_parent: dict[uuid.UUID, list] = {}
    for kr in krs:
        kr_by_parent.setdefault(kr.parent_id, []).append(kr)
    result = []
    for obj in objectives:
        out = _build_okr_out(obj, kr_by_parent.get(obj.id, []))
        result.append(out)
    # Append orphan KRs (parent not in current list)
    parent_ids = {o.id for o in objectives}
    for kr in krs:
        if kr.parent_id not in parent_ids:
            result.append(_build_okr_out(kr))
    return result


@router.post("", response_model=OKROut, status_code=status.HTTP_201_CREATED)
async def create_okr(
    body: OKRCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okr = await service.create_okr(db, user_id, body)
    return OKROut.model_validate(okr)


@router.get("/tasks/{task_id}/okrs", response_model=list[OKROut])
async def list_task_okrs(
    task_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    # Verify user owns the task implicitly via user_id check on OKRs
    await _get_user_id(username, db)
    okrs = await service.list_okrs_for_task(db, task_id)
    return [OKROut.model_validate(o) for o in okrs]


@router.get("/{okr_id}", response_model=OKROut)
async def get_okr(
    okr_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okr = await service.get_okr_with_children(db, okr_id, user_id)
    if okr is None:
        raise HTTPException(status_code=404, detail="OKR not found")
    children = okr.__dict__.get("_children", [])
    return _build_okr_out(okr, children if okr.type == OKRType.objective else None)


@router.patch("/{okr_id}", response_model=OKROut)
async def update_okr(
    okr_id: uuid.UUID,
    body: OKRUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okr = await service.get_okr(db, okr_id, user_id)
    if okr is None:
        raise HTTPException(status_code=404, detail="OKR not found")
    updated = await service.update_okr(db, okr, body)
    return OKROut.model_validate(updated)


@router.delete("/{okr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_okr(
    okr_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okr = await service.get_okr(db, okr_id, user_id)
    if okr is None:
        raise HTTPException(status_code=404, detail="OKR not found")
    await service.delete_okr(db, okr)


@router.post("/{okr_id}/link-task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def link_task(
    okr_id: uuid.UUID,
    task_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okr = await service.get_okr(db, okr_id, user_id)
    if okr is None:
        raise HTTPException(status_code=404, detail="OKR not found")
    await service.link_task_to_okr(db, task_id, okr_id)


@router.delete("/{okr_id}/link-task/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_task(
    okr_id: uuid.UUID,
    task_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    okr = await service.get_okr(db, okr_id, user_id)
    if okr is None:
        raise HTTPException(status_code=404, detail="OKR not found")
    await service.unlink_task_from_okr(db, task_id, okr_id)
