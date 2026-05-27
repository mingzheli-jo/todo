from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def init_engine() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    _sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    return _sessionmaker


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    sm = _sessionmaker or init_engine()
    async with sm() as session:
        yield session
