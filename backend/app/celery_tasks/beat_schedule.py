"""
Celery Beat schedule for periodic summary generation.

Weekly summary: every Monday at 02:00 UTC — covers previous Mon–Sun
Monthly summary: 1st of every month at 03:00 UTC — covers previous month
"""
from celery.schedules import crontab

beat_schedule = {
    "weekly-summary-trigger": {
        "task": "app.celery_tasks.summary_tasks.trigger_weekly_summary",
        "schedule": crontab(hour=2, minute=0, day_of_week=1),
    },
    "monthly-summary-trigger": {
        "task": "app.celery_tasks.summary_tasks.trigger_monthly_summary",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),
    },
}
