from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/toto"
    redis_url: str = "redis://localhost:6379/0"
    admin_username: str = "admin"
    admin_password_hash: str = ""
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    encryption_key: str = ""
    default_ai_provider: str = "deepseek"
    default_ai_base_url: str = "https://api.deepseek.com/v1"
    default_ai_api_key: str = ""
    default_ai_model: str = "deepseek-chat"
    celery_worker_concurrency: int = 2
    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
