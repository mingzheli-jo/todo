import asyncio
import json
import uuid

from app.celery_tasks.celery_app import celery_app


STRUCTURED_PROMPT = """你是一个个人成长助手。请将以下每日复盘内容结构化提取，输出 JSON 格式，包含以下字段：
- achievements: 今日成就列表（字符串数组）
- challenges: 遇到的挑战列表（字符串数组）
- learnings: 今日学习/感悟列表（字符串数组）
- tomorrow_plans: 明日计划列表（字符串数组）
- keywords: 关键词列表（字符串数组）

只输出合法的 JSON，不要有任何额外说明。

复盘内容：
{content}"""

POLISH_PROMPT = """你是一个文字润色专家。请将以下每日复盘内容润色成一篇流畅、有条理的复盘文章，保持原有信息，适当扩展表达，使用中文写作。

复盘内容：
{content}

请直接输出润色后的文章，不要有任何额外说明。"""


def _run_ai_processing(review_id: str) -> None:
    """Synchronous wrapper that runs async AI processing."""
    asyncio.run(_async_process(review_id))


async def _async_process(review_id: str) -> None:
    from openai import AsyncOpenAI
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select

    from app.config import get_settings
    from app.reviews.models import DailyReview
    from app.ai_providers.models import AIProvider

    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    sm = async_sessionmaker(engine, expire_on_commit=False)

    async with sm() as db:
        review_uuid = uuid.UUID(review_id)
        result = await db.execute(select(DailyReview).where(DailyReview.id == review_uuid))
        review = result.scalar_one_or_none()
        if review is None:
            return

        provider_result = await db.execute(select(AIProvider).where(AIProvider.is_default == True))  # noqa: E712
        provider = provider_result.scalar_one_or_none()

        if provider is None:
            return

        client = AsyncOpenAI(
            api_key=provider.api_key_enc or "placeholder",
            base_url=provider.base_url,
        )

        content = review.raw_content or ""

        try:
            struct_resp = await client.chat.completions.create(
                model=provider.model_name,
                messages=[{"role": "user", "content": STRUCTURED_PROMPT.format(content=content)}],
                temperature=0.3,
            )
            struct_text = struct_resp.choices[0].message.content or "{}"
            try:
                ai_structured = json.loads(struct_text)
            except json.JSONDecodeError:
                ai_structured = {"raw": struct_text}

            polish_resp = await client.chat.completions.create(
                model=provider.model_name,
                messages=[{"role": "user", "content": POLISH_PROMPT.format(content=content)}],
                temperature=0.7,
            )
            ai_polished = polish_resp.choices[0].message.content or ""

            review.ai_structured = ai_structured
            review.ai_polished = ai_polished
            await db.commit()
        except Exception:
            pass

    await engine.dispose()


@celery_app.task(name="app.celery_tasks.ai_tasks.process_daily_review")
def process_daily_review(review_id: str) -> dict:
    _run_ai_processing(review_id)
    return {"review_id": review_id, "status": "done"}
