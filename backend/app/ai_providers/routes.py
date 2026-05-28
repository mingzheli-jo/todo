import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.ai_providers.schemas import AIProviderCreate, AIProviderOut, AIProviderUpdate
from app.ai_providers import service

router = APIRouter()


@router.get("", response_model=list[AIProviderOut])
async def list_providers(
    _: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    providers = await service.list_providers(db)
    return [AIProviderOut.model_validate(p) for p in providers]


@router.post("", response_model=AIProviderOut, status_code=status.HTTP_201_CREATED)
async def create_provider(
    body: AIProviderCreate,
    _: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    provider = await service.create_provider(db, body)
    return AIProviderOut.model_validate(provider)


@router.patch("/{provider_id}", response_model=AIProviderOut)
async def update_provider(
    provider_id: uuid.UUID,
    body: AIProviderUpdate,
    _: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    provider = await service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    updated = await service.update_provider(db, provider, body)
    return AIProviderOut.model_validate(updated)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: uuid.UUID,
    _: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    provider = await service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    await service.delete_provider(db, provider)


@router.post("/{provider_id}/set-default", response_model=AIProviderOut)
async def set_default(
    provider_id: uuid.UUID,
    _: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    provider = await service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    updated = await service.set_default_provider(db, provider)
    return AIProviderOut.model_validate(updated)
