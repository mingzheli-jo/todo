from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_today_review_auto_creates(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.get("/api/reviews/today", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == date.today().isoformat()
    assert data["raw_content"] == ""
    assert data["ai_structured"] is None
    assert data["ai_polished"] is None


@pytest.mark.asyncio
async def test_get_today_review_idempotent(client: AsyncClient):
    token = await _get_token(client)
    resp1 = await client.get("/api/reviews/today", headers=_auth(token))
    resp2 = await client.get("/api/reviews/today", headers=_auth(token))
    assert resp1.json()["id"] == resp2.json()["id"]


@pytest.mark.asyncio
async def test_upsert_review_create(client: AsyncClient):
    token = await _get_token(client)
    today = date.today().isoformat()
    resp = await client.post(
        "/api/reviews",
        json={"date": today, "raw_content": "今天完成了很多任务", "mood": 4},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["raw_content"] == "今天完成了很多任务"
    assert data["mood"] == 4


@pytest.mark.asyncio
async def test_upsert_review_updates_existing(client: AsyncClient):
    token = await _get_token(client)
    today = date.today().isoformat()
    await client.post(
        "/api/reviews",
        json={"date": today, "raw_content": "初稿", "mood": 3},
        headers=_auth(token),
    )
    resp = await client.post(
        "/api/reviews",
        json={"date": today, "raw_content": "更新后的内容", "mood": 5},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["raw_content"] == "更新后的内容"
    assert data["mood"] == 5


@pytest.mark.asyncio
async def test_update_review_patch(client: AsyncClient):
    token = await _get_token(client)
    today = date.today().isoformat()
    create_resp = await client.post(
        "/api/reviews",
        json={"date": today, "raw_content": "原始内容"},
        headers=_auth(token),
    )
    rid = create_resp.json()["id"]
    resp = await client.patch(
        f"/api/reviews/{rid}",
        json={"raw_content": "修改后内容", "mood": 2},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["raw_content"] == "修改后内容"
    assert resp.json()["mood"] == 2


@pytest.mark.asyncio
async def test_list_reviews_by_date_range(client: AsyncClient):
    token = await _get_token(client)
    today = date.today()
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)

    for d, content in [(today, "今天"), (yesterday, "昨天"), (two_days_ago, "前天")]:
        await client.post(
            "/api/reviews",
            json={"date": d.isoformat(), "raw_content": content},
            headers=_auth(token),
        )

    resp = await client.get(
        f"/api/reviews?start_date={yesterday.isoformat()}&end_date={today.isoformat()}",
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    dates = {r["date"] for r in data}
    assert today.isoformat() in dates
    assert yesterday.isoformat() in dates


@pytest.mark.asyncio
async def test_ai_process_mock_celery(client: AsyncClient):
    token = await _get_token(client)
    today = date.today().isoformat()
    create_resp = await client.post(
        "/api/reviews",
        json={"date": today, "raw_content": "今天学了很多东西"},
        headers=_auth(token),
    )
    rid = create_resp.json()["id"]

    mock_task = MagicMock()
    mock_task.id = "mock-celery-task-id-123"

    with patch("app.reviews.routes.process_daily_review") as mock_process:
        mock_process.delay.return_value = mock_task
        resp = await client.post(f"/api/reviews/{rid}/ai-process", headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert data["task_id"] == "mock-celery-task-id-123"


@pytest.mark.asyncio
async def test_ai_status_idle(client: AsyncClient):
    token = await _get_token(client)
    today = date.today().isoformat()
    create_resp = await client.post(
        "/api/reviews",
        json={"date": today, "raw_content": "内容"},
        headers=_auth(token),
    )
    rid = create_resp.json()["id"]
    resp = await client.get(f"/api/reviews/{rid}/ai-status", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["status"] == "idle"
