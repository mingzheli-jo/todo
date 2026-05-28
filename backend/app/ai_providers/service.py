import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_providers.models import AIProvider
from app.ai_providers.schemas import AIProviderCreate, AIProviderUpdate


async def list_providers(db: AsyncSession) -> list[AIProvider]:
    result = await db.execute(select(AIProvider).order_by(AIProvider.created_at))
    return list(result.scalars().all())


async def get_provider(db: AsyncSession, provider_id: uuid.UUID) -> AIProvider | None:
    result = await db.execute(select(AIProvider).where(AIProvider.id == provider_id))
    return result.scalar_one_or_none()


async def get_default_provider(db: AsyncSession) -> AIProvider | None:
    result = await db.execute(select(AIProvider).where(AIProvider.is_default == True))  # noqa: E712
    return result.scalar_one_or_none()


async def create_provider(db: AsyncSession, data: AIProviderCreate) -> AIProvider:
    if data.is_default:
        await db.execute(update(AIProvider).values(is_default=False))
    provider = AIProvider(
        name=data.name,
        base_url=data.base_url,
        api_key_enc=data.api_key,
        model_name=data.model_name,
        is_default=data.is_default,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return provider


async def update_provider(db: AsyncSession, provider: AIProvider, data: AIProviderUpdate) -> AIProvider:
    update_data = data.model_dump(exclude_unset=True)
    if "api_key" in update_data:
        provider.api_key_enc = update_data.pop("api_key")
    if update_data.get("is_default"):
        await db.execute(update(AIProvider).where(AIProvider.id != provider.id).values(is_default=False))
    for key, value in update_data.items():
        setattr(provider, key, value)
    await db.commit()
    await db.refresh(provider)
    return provider


async def delete_provider(db: AsyncSession, provider: AIProvider) -> None:
    await db.delete(provider)
    await db.commit()


async def set_default_provider(db: AsyncSession, provider: AIProvider) -> AIProvider:
    await db.execute(update(AIProvider).values(is_default=False))
    provider.is_default = True
    await db.commit()
    await db.refresh(provider)
    return provider
