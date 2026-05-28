from celery import Celery

from app.config import get_settings


def make_celery() -> Celery:
    settings = get_settings()
    app = Celery(
        "toto",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["app.celery_tasks.ai_tasks", "app.celery_tasks.summary_tasks"],
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
    from app.celery_tasks.beat_schedule import beat_schedule
    app.conf.beat_schedule = beat_schedule
    return app


celery_app = make_celery()
