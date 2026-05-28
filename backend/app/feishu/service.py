import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.feishu.models import FeishuConfig
from app.feishu.schemas import FeishuConfigUpdate


async def get_config(db: AsyncSession, user_id: uuid.UUID) -> FeishuConfig | None:
    result = await db.execute(
        select(FeishuConfig).where(FeishuConfig.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def upsert_config(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: FeishuConfigUpdate,
) -> FeishuConfig:
    existing = await get_config(db, user_id)
    if existing is not None:
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(existing, key, value)
        await db.commit()
        await db.refresh(existing)
        return existing

    create_kwargs: dict = {}
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        create_kwargs[key] = value

    config = FeishuConfig(user_id=user_id, **create_kwargs)
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def delete_config(db: AsyncSession, user_id: uuid.UUID) -> bool:
    config = await get_config(db, user_id)
    if config is None:
        return False
    await db.delete(config)
    await db.commit()
    return True


async def push_summary_to_feishu(webhook_url: str, summary: object) -> bool:
    """Push an AISummary to Feishu via webhook. Returns True on success."""
    from app.summaries.models import SummaryType

    summary_type = getattr(summary, "type", "weekly")
    period_start = getattr(summary, "period_start", "")
    period_end = getattr(summary, "period_end", "")
    content = getattr(summary, "content", "")
    metrics = getattr(summary, "metrics", {}) or {}

    if summary_type == SummaryType.weekly or summary_type == "weekly":
        title = f"周汇总 {period_start} ~ {period_end}"
        template = "purple"
    else:
        title = f"月汇总 {period_start} ~ {period_end}"
        template = "blue"

    # Build metrics overview text
    tasks = metrics.get("tasks", {})
    habits = metrics.get("habits", {})
    pomodoro = metrics.get("pomodoro", {})
    okrs = metrics.get("okrs", {})

    stats_lines = []
    if tasks:
        stats_lines.append(f"**任务完成：** {tasks.get('completed_total', 0)} 项")
    if habits:
        rate = habits.get("completion_rate", 0)
        stats_lines.append(f"**习惯完成率：** {int(rate * 100)}%")
        if habits.get("best_streak_habit"):
            stats_lines.append(f"**坚持最好的习惯：** {habits['best_streak_habit']}")
    if pomodoro:
        stats_lines.append(f"**番茄钟：** {pomodoro.get('completed_sessions', 0)} 个 / {pomodoro.get('total_minutes', 0)} 分钟")
    if okrs:
        stats_lines.append(f"**OKR 平均进度：** {okrs.get('avg_progress', 0)}%")

    stats_text = "\n".join(stats_lines) if stats_lines else "暂无统计数据"

    payload = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": f"📊 {title}"},
                "template": template,
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": content[:2000] if content else "（暂无汇总内容）",
                    },
                },
                {"tag": "hr"},
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": f"**统计概览**\n{stats_text}",
                    },
                },
            ],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code == 200
    except Exception:
        return False
