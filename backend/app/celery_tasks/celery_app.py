from celery import Celery

from app.config import get_settings


def make_celery() -> Celery:
    settings = get_settings()
    app = Celery(
        "toto",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["app.celery_tasks.ai_tasks"],
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
    return app


celery_app = make_celery()
