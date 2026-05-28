import asyncio
import os
import uuid
from collections.abc import AsyncGenerator

# Set encryption key BEFORE any app imports so get_settings() picks it up on first call
from cryptography.fernet import Fernet
_TEST_FERNET_KEY = Fernet.generate_key().decode()
os.environ["ENCRYPTION_KEY"] = _TEST_FERNET_KEY

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
# Clear the lru_cache so get_settings re-reads the env var we just set
get_settings.cache_clear()

from app.auth.models import User
from app.auth.password import hash_password
from app.db.base import Base
from app.main import create_app
from app.api.deps import get_db

# Ensure new models are registered with Base metadata
import app.ai_providers.models  # noqa: F401
import app.reviews.models  # noqa: F401
import app.okrs.models  # noqa: F401
import app.habits.models  # noqa: F401
import app.pomodoro.models  # noqa: F401
import app.summaries.models  # noqa: F401
import app.feishu.models  # noqa: F401

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(engine, expire_on_commit=False)
    async with sm() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def seed_admin(db_session: AsyncSession):
    admin = User(id=uuid.uuid4(), username="admin", password_hash=hash_password("admin123"), email="admin@toto.local")
    db_session.add(admin)
    await db_session.commit()
    return admin


@pytest.fixture
async def client(db_session: AsyncSession, seed_admin) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
