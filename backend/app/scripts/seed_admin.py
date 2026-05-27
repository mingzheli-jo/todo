"""Seed the admin user if it doesn't exist. Run inside the api container on first deploy."""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.models import User
from app.auth.password import hash_password
from app.config import get_settings


async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    sm = async_sessionmaker(engine, expire_on_commit=False)

    async with sm() as session:
        result = await session.execute(select(User).where(User.username == settings.admin_username))
        if result.scalar_one_or_none() is not None:
            print(f"Admin user '{settings.admin_username}' already exists, skipping.")
            return

        if not settings.admin_password_hash:
            print("ERROR: ADMIN_PASSWORD_HASH not set in .env")
            return

        user = User(
            username=settings.admin_username,
            password_hash=settings.admin_password_hash,
            email="admin@toto.local",
        )
        session.add(user)
        await session.commit()
        print(f"Admin user '{settings.admin_username}' created.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
