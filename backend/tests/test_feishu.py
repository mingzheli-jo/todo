"""Tests for the feishu module."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.feishu import service as feishu_service
from app.feishu.models import FeishuConfig
from app.feishu.schemas import FeishuConfigUpdate


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── GET /feishu/config ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_config_no_config(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.get("/api/feishu/config", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_webhook"] is False
    assert data["push_weekly"] is True
    assert data["push_monthly"] is True
    assert data["push_hour"] == 9
    assert data["enabled"] is True
    # webhook_url must NOT be in the response
    assert "webhook_url" not in data


@pytest.mark.asyncio
async def test_get_config_hides_webhook_url(client: AsyncClient, db_session: AsyncSession, seed_admin):
    token = await _get_token(client)

    config = FeishuConfig(
        user_id=seed_admin.id,
        webhook_url="https://open.feishu.cn/secret-webhook",
        push_weekly=True,
        push_monthly=False,
        push_hour=8,
        enabled=True,
    )
    db_session.add(config)
    await db_session.commit()

    resp = await client.get("/api/feishu/config", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_webhook"] is True
    assert data["push_monthly"] is False
    assert data["push_hour"] == 8
    # Raw webhook_url must NOT be exposed
    assert "webhook_url" not in data
    assert "https://open.feishu.cn" not in str(data)


# ── PUT /feishu/config ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_put_config_creates(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.put(
        "/api/feishu/config",
        json={
            "webhook_url": "https://open.feishu.cn/webhook/abc",
            "push_weekly": True,
            "push_monthly": True,
            "push_hour": 10,
            "enabled": True,
        },
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_webhook"] is True
    assert data["push_hour"] == 10
    assert "webhook_url" not in data


@pytest.mark.asyncio
async def test_put_config_updates(client: AsyncClient):
    token = await _get_token(client)
    # Create
    await client.put(
        "/api/feishu/config",
        json={"webhook_url": "https://open.feishu.cn/webhook/abc", "push_hour": 9},
        headers=_auth(token),
    )
    # Update
    resp = await client.put(
        "/api/feishu/config",
        json={"push_hour": 18, "push_monthly": False},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["push_hour"] == 18
    assert data["push_monthly"] is False


# ── DELETE /feishu/config ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_config(client: AsyncClient):
    token = await _get_token(client)
    await client.put(
        "/api/feishu/config",
        json={"webhook_url": "https://open.feishu.cn/webhook/xyz"},
        headers=_auth(token),
    )
    resp = await client.delete("/api/feishu/config", headers=_auth(token))
    assert resp.status_code == 204

    # After delete, GET returns no webhook
    resp2 = await client.get("/api/feishu/config", headers=_auth(token))
    assert resp2.json()["has_webhook"] is False


# ── POST /feishu/test ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_test_webhook_no_config(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/feishu/test", headers=_auth(token))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_test_webhook_success(client: AsyncClient):
    token = await _get_token(client)
    # Configure webhook first
    await client.put(
        "/api/feishu/config",
        json={"webhook_url": "https://open.feishu.cn/webhook/test123", "enabled": True},
        headers=_auth(token),
    )

    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("app.feishu.routes.httpx.AsyncClient") as mock_client_cls:
        mock_async_client = AsyncMock()
        mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
        mock_async_client.__aexit__ = AsyncMock(return_value=False)
        mock_async_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_async_client

        resp = await client.post("/api/feishu/test", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_test_webhook_disabled(client: AsyncClient):
    token = await _get_token(client)
    await client.put(
        "/api/feishu/config",
        json={"webhook_url": "https://open.feishu.cn/webhook/test123", "enabled": False},
        headers=_auth(token),
    )
    resp = await client.post("/api/feishu/test", headers=_auth(token))
    assert resp.status_code == 400


# ── Service unit tests ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_push_summary_to_feishu_success():
    mock_summary = MagicMock()
    mock_summary.type = "weekly"
    mock_summary.period_start = "2026-05-18"
    mock_summary.period_end = "2026-05-24"
    mock_summary.content = "This week was productive."
    mock_summary.metrics = {
        "tasks": {"completed_total": 10},
        "habits": {"completion_rate": 0.85, "best_streak_habit": "晨跑", "total_check_ins": 6},
        "pomodoro": {"completed_sessions": 8, "total_minutes": 200},
        "okrs": {"avg_progress": 75.0},
    }

    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("app.feishu.service.httpx.AsyncClient") as mock_client_cls:
        mock_async_client = AsyncMock()
        mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
        mock_async_client.__aexit__ = AsyncMock(return_value=False)
        mock_async_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_async_client

        result = await feishu_service.push_summary_to_feishu(
            "https://open.feishu.cn/webhook/test", mock_summary
        )

    assert result is True


@pytest.mark.asyncio
async def test_push_summary_to_feishu_failure():
    mock_summary = MagicMock()
    mock_summary.type = "monthly"
    mock_summary.period_start = "2026-05-01"
    mock_summary.period_end = "2026-05-31"
    mock_summary.content = ""
    mock_summary.metrics = {}

    with patch("app.feishu.service.httpx.AsyncClient") as mock_client_cls:
        mock_async_client = AsyncMock()
        mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
        mock_async_client.__aexit__ = AsyncMock(return_value=False)
        mock_async_client.post = AsyncMock(side_effect=Exception("Connection error"))
        mock_client_cls.return_value = mock_async_client

        result = await feishu_service.push_summary_to_feishu(
            "https://open.feishu.cn/webhook/test", mock_summary
        )

    assert result is False
