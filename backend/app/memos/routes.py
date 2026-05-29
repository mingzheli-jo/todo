import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.memos import service
from app.memos.schemas import MemoConvert, MemoConvertOut, MemoCreate, MemoOut, MemoUpdate
from app.tasks_domain.schemas import TaskOut

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("", response_model=list[MemoOut])
async def list_memos(
    status_filter: str = Query("open", alias="status", pattern="^(open|done|all)$"),
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memos = await service.list_memos(db, user_id, status=status_filter)
    return [MemoOut.model_validate(m) for m in memos]


@router.post("", response_model=MemoOut, status_code=status.HTTP_201_CREATED)
async def create_memo(
    body: MemoCreate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.create_memo(db, user_id, body)
    return MemoOut.model_validate(memo)


@router.patch("/{memo_id}", response_model=MemoOut)
async def update_memo(
    memo_id: uuid.UUID,
    body: MemoUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.get_memo(db, memo_id, user_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    updated = await service.update_memo(db, memo, body)
    return MemoOut.model_validate(updated)


@router.delete("/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memo(
    memo_id: uuid.UUID,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.get_memo(db, memo_id, user_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    await service.delete_memo(db, memo)


@router.post("/{memo_id}/convert", response_model=MemoConvertOut)
async def convert_memo(
    memo_id: uuid.UUID,
    body: MemoConvert,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    memo = await service.get_memo(db, memo_id, user_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    updated_memo, task = await service.convert_to_task(db, memo, body)
    return MemoConvertOut(memo=MemoOut.model_validate(updated_memo), task=TaskOut.model_validate(task))
