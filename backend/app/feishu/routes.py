import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_username
from app.auth.models import User
from app.feishu.schemas import FeishuConfigOut, FeishuConfigUpdate
from app.feishu import service

router = APIRouter()


async def _get_user_id(username: str, db: AsyncSession) -> uuid.UUID:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


@router.get("/config", response_model=FeishuConfigOut)
async def get_config(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    config = await service.get_config(db, user_id)
    if config is None:
        return FeishuConfigOut(
            has_webhook=False,
            push_weekly=True,
            push_monthly=True,
            push_hour=9,
            enabled=True,
        )
    return FeishuConfigOut(
        has_webhook=bool(config.webhook_url),
        push_weekly=config.push_weekly,
        push_monthly=config.push_monthly,
        push_hour=config.push_hour,
        enabled=config.enabled,
    )


@router.put("/config", response_model=FeishuConfigOut)
async def update_config(
    body: FeishuConfigUpdate,
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    config = await service.upsert_config(db, user_id, body)
    return FeishuConfigOut(
        has_webhook=bool(config.webhook_url),
        push_weekly=config.push_weekly,
        push_monthly=config.push_monthly,
        push_hour=config.push_hour,
        enabled=config.enabled,
    )


@router.delete("/config", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    await service.delete_config(db, user_id)


@router.post("/test")
async def test_webhook(
    username: str = Depends(get_current_username),
    db: AsyncSession = Depends(get_db),
):
    user_id = await _get_user_id(username, db)
    config = await service.get_config(db, user_id)
    if config is None or not config.webhook_url:
        raise HTTPException(status_code=400, detail="飞书 Webhook 未配置")
    if not config.enabled:
        raise HTTPException(status_code=400, detail="飞书推送已禁用")

    payload = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": "📢 Toto 测试消息"},
                "template": "green",
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": "飞书推送配置成功！Toto 将会按时向此 Webhook 推送周/月汇总报告。",
                    },
                }
            ],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(config.webhook_url, json=payload)
            if resp.status_code == 200:
                return {"success": True}
            raise HTTPException(status_code=502, detail=f"飞书返回错误: {resp.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"请求失败: {str(e)}")
