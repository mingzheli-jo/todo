import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

from app.celery_tasks.celery_app import celery_app


SUMMARY_PROMPT = """你是一个个人成长助手。请根据以下数据生成一份{period_type}汇总报告，用中文写作，结构清晰，包含以下部分：
1. 整体概述（2-3句话）
2. 本期亮点（列出3-5个具体成就或进展）
3. 数据洞察（基于统计数据分析趋势和规律）
4. 改进建议（2-3条具体可行的建议）

统计数据：
{metrics_text}

复盘摘要（最近几条）：
{reviews_text}

请直接输出汇总报告，不要有额外说明。"""


def _build_metrics_text(metrics: dict) -> str:
    lines = []
    tasks = metrics.get("tasks", {})
    habits = metrics.get("habits", {})
    pomodoro = metrics.get("pomodoro", {})
    okrs = metrics.get("okrs", {})

    if tasks:
        lines.append(f"- 完成任务: {tasks.get('completed_total', 0)} 项")
        by_q = tasks.get("completed_by_quadrant", {})
        if by_q:
            lines.append(f"  - 重要紧急: {by_q.get('urgent_important', 0)}, 重要不紧急: {by_q.get('important', 0)}, 紧急不重要: {by_q.get('urgent', 0)}, 其他: {by_q.get('neither', 0)}")
    if habits:
        rate = habits.get("completion_rate", 0)
        lines.append(f"- 习惯完成率: {int(rate * 100)}%")
        lines.append(f"- 习惯打卡次数: {habits.get('total_check_ins', 0)}")
        if habits.get("best_streak_habit"):
            lines.append(f"- 坚持最好的习惯: {habits['best_streak_habit']}")
    if pomodoro:
        lines.append(f"- 番茄钟: 完成 {pomodoro.get('completed_sessions', 0)} 个，共 {pomodoro.get('total_minutes', 0)} 分钟")
    if okrs:
        lines.append(f"- OKR 平均进度: {okrs.get('avg_progress', 0)}%，完成 {okrs.get('completed_count', 0)} 个关键结果")

    return "\n".join(lines) if lines else "暂无数据"


def _build_reviews_text(metrics: dict) -> str:
    reviews = metrics.get("reviews", {})
    aggregated = reviews.get("ai_structured_aggregated", [])
    if not aggregated:
        return "本期无复盘记录"

    lines = []
    for item in aggregated[:5]:  # limit to 5 recent reviews
        if isinstance(item, dict):
            achievements = item.get("achievements", [])
            if achievements:
                lines.append("成就: " + "、".join(str(a) for a in achievements[:3]))
    return "\n".join(lines) if lines else "本期无结构化复盘数据"


async def _async_generate_summary(
    user_id: str,
    summary_type: str,
    period_start: str,
    period_end: str,
) -> str:
    from openai import AsyncOpenAI
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select

    from app.config import get_settings
    from app.ai_providers.models import AIProvider
    from app.summaries import service as summary_service
    from app.feishu import service as feishu_service

    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    sm = async_sessionmaker(engine, expire_on_commit=False)

    summary_id = ""

    async with sm() as db:
        uid = uuid.UUID(user_id)
        start_date = date.fromisoformat(period_start)
        end_date = date.fromisoformat(period_end)

        metrics = await summary_service.aggregate_metrics(db, uid, start_date, end_date)

        provider_result = await db.execute(
            select(AIProvider).where(AIProvider.is_default == True)  # noqa: E712
        )
        provider = provider_result.scalar_one_or_none()

        content = ""
        if provider is not None:
            client = AsyncOpenAI(
                api_key=provider.api_key_enc or "placeholder",
                base_url=provider.base_url,
            )
            period_type = "周" if summary_type == "weekly" else "月"
            prompt = SUMMARY_PROMPT.format(
                period_type=period_type,
                metrics_text=_build_metrics_text(metrics),
                reviews_text=_build_reviews_text(metrics),
            )
            try:
                resp = await client.chat.completions.create(
                    model=provider.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.5,
                )
                content = resp.choices[0].message.content or ""
            except Exception:
                content = f"AI 汇总生成失败，请稍后重试。\n\n统计数据：\n{_build_metrics_text(metrics)}"

        summary = await summary_service.create_summary(
            db, uid, summary_type, start_date, end_date, content, metrics
        )
        summary_id = str(summary.id)

        # Push to Feishu if configured
        feishu_config = await feishu_service.get_config(db, uid)
        if feishu_config and feishu_config.enabled and feishu_config.webhook_url:
            should_push = (
                (summary_type == "weekly" and feishu_config.push_weekly)
                or (summary_type == "monthly" and feishu_config.push_monthly)
            )
            if should_push:
                pushed = await feishu_service.push_summary_to_feishu(
                    feishu_config.webhook_url, summary
                )
                if pushed:
                    await summary_service.mark_pushed(db, summary.id)

    await engine.dispose()
    return summary_id


@celery_app.task(name="app.celery_tasks.summary_tasks.generate_summary_task")
def generate_summary_task(
    user_id: str,
    summary_type: str,
    period_start: str,
    period_end: str,
) -> dict:
    summary_id = asyncio.run(
        _async_generate_summary(user_id, summary_type, period_start, period_end)
    )
    return {"summary_id": summary_id, "status": "done"}


def _get_all_user_ids() -> list[str]:
    """Return all user IDs synchronously for beat tasks."""
    import asyncio as _asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select as _select
    from app.config import get_settings
    from app.auth.models import User

    async def _fetch():
        settings = get_settings()
        engine = create_async_engine(settings.database_url, echo=False)
        sm = async_sessionmaker(engine, expire_on_commit=False)
        async with sm() as db:
            result = await db.execute(_select(User.id))
            ids = [str(row[0]) for row in result.all()]
        await engine.dispose()
        return ids

    return _asyncio.run(_fetch())


@celery_app.task(name="app.celery_tasks.summary_tasks.trigger_weekly_summary")
def trigger_weekly_summary() -> dict:
    """Compute last week's date range and dispatch generate_summary_task for all users."""
    today = datetime.now(timezone.utc).date()
    # Last Monday
    days_since_monday = today.weekday()  # Monday=0
    last_monday = today - timedelta(days=days_since_monday + 7)
    last_sunday = last_monday + timedelta(days=6)

    user_ids = _get_all_user_ids()
    for uid in user_ids:
        generate_summary_task.delay(uid, "weekly", last_monday.isoformat(), last_sunday.isoformat())
    return {"dispatched": len(user_ids), "period": f"{last_monday} ~ {last_sunday}"}


@celery_app.task(name="app.celery_tasks.summary_tasks.trigger_monthly_summary")
def trigger_monthly_summary() -> dict:
    """Compute last month's date range and dispatch generate_summary_task for all users."""
    today = datetime.now(timezone.utc).date()
    first_of_current = today.replace(day=1)
    last_day_of_prev = first_of_current - timedelta(days=1)
    first_of_prev = last_day_of_prev.replace(day=1)

    user_ids = _get_all_user_ids()
    for uid in user_ids:
        generate_summary_task.delay(uid, "monthly", first_of_prev.isoformat(), last_day_of_prev.isoformat())
    return {"dispatched": len(user_ids), "period": f"{first_of_prev} ~ {last_day_of_prev}"}
