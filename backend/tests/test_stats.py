import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_today_stats_empty(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.get("/api/stats/today", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data == {"completed": 0, "pending": 0, "total": 0}


@pytest.mark.asyncio
async def test_today_stats_with_tasks(client: AsyncClient):
    token = await _get_token(client)

    await client.post("/api/tasks", json={"title": "T1"}, headers=_auth(token))
    await client.post("/api/tasks", json={"title": "T2"}, headers=_auth(token))
    done_resp = await client.post("/api/tasks", json={"title": "T3"}, headers=_auth(token))
    await client.patch(f"/api/tasks/{done_resp.json()['id']}", json={"status": "done"}, headers=_auth(token))

    resp = await client.get("/api/stats/today", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["completed"] == 1
    assert data["pending"] == 2
    assert data["total"] == 3


@pytest.mark.asyncio
async def test_today_stats_excludes_cancelled(client: AsyncClient):
    token = await _get_token(client)

    await client.post("/api/tasks", json={"title": "Active"}, headers=_auth(token))
    cancelled = await client.post("/api/tasks", json={"title": "Cancelled"}, headers=_auth(token))
    await client.patch(
        f"/api/tasks/{cancelled.json()['id']}",
        json={"status": "cancelled"},
        headers=_auth(token),
    )

    resp = await client.get("/api/stats/today", headers=_auth(token))
    data = resp.json()
    assert data["total"] == 1
    assert data["completed"] == 0
    assert data["pending"] == 1
