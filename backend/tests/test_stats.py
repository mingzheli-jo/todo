import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_stats_overview_empty(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.get("/api/stats/overview", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert "tasks" in data
    assert "pomodoro" in data
    assert "projects" in data
    assert "okrs_top" in data
    assert "habits_weekly" in data
    assert data["tasks"]["total"] == 0
    assert data["tasks"]["completed"] == 0
    assert data["tasks"]["completion_rate"] == 0
    assert len(data["tasks"]["completed_last_7_days"]) == 7
    assert data["pomodoro"]["total_minutes_all_time"] == 0
    assert data["projects"] == []
    assert data["okrs_top"] == []
    assert data["habits_weekly"] == []


@pytest.mark.asyncio
async def test_stats_overview_with_data(client: AsyncClient):
    token = await _get_token(client)

    # Create tasks
    t1 = await client.post("/api/tasks", json={"title": "Task A"}, headers=_auth(token))
    t2 = await client.post("/api/tasks", json={"title": "Task B"}, headers=_auth(token))
    await client.patch(f"/api/tasks/{t1.json()['id']}", json={"status": "done"}, headers=_auth(token))
    await client.patch(f"/api/tasks/{t2.json()['id']}", json={"status": "cancelled"}, headers=_auth(token))

    # Create a project
    await client.post(
        "/api/projects",
        json={"name": "Test Project", "icon": "🚀", "color": "#6366f1"},
        headers=_auth(token),
    )

    # Create an OKR objective
    await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "My Objective", "period": "2025-Q2"},
        headers=_auth(token),
    )

    resp = await client.get("/api/stats/overview", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["tasks"]["total"] == 1  # cancelled excluded
    assert data["tasks"]["completed"] == 1
    assert data["tasks"]["completion_rate"] == 100
    assert len(data["projects"]) == 1
    assert data["projects"][0]["name"] == "Test Project"
    assert len(data["okrs_top"]) == 1
    assert data["okrs_top"][0]["title"] == "My Objective"


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
