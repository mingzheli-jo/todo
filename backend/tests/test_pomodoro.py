import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_start_session(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["duration_min"] == 25
    assert data["completed_at"] is None
    assert data["interrupted"] is False


@pytest.mark.asyncio
async def test_complete_session(client: AsyncClient):
    token = await _get_token(client)
    start_resp = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    session_id = start_resp.json()["id"]

    complete_resp = await client.post(
        f"/api/pomodoro/{session_id}/complete",
        json={"interrupted": False},
        headers=_auth(token),
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()
    assert data["completed_at"] is not None
    assert data["interrupted"] is False


@pytest.mark.asyncio
async def test_interrupted_session(client: AsyncClient):
    token = await _get_token(client)
    start_resp = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    session_id = start_resp.json()["id"]

    complete_resp = await client.post(
        f"/api/pomodoro/{session_id}/complete",
        json={"interrupted": True},
        headers=_auth(token),
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["interrupted"] is True


@pytest.mark.asyncio
async def test_current_session(client: AsyncClient):
    token = await _get_token(client)

    # No current session initially
    current_resp = await client.get("/api/pomodoro/current", headers=_auth(token))
    assert current_resp.status_code == 200
    assert current_resp.json() is None

    # Start one
    start_resp = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    session_id = start_resp.json()["id"]

    # Should now return the current session
    current_resp2 = await client.get("/api/pomodoro/current", headers=_auth(token))
    assert current_resp2.status_code == 200
    assert current_resp2.json()["id"] == session_id

    # Complete it
    await client.post(f"/api/pomodoro/{session_id}/complete", json={"interrupted": False}, headers=_auth(token))

    # No current session again
    current_resp3 = await client.get("/api/pomodoro/current", headers=_auth(token))
    assert current_resp3.json() is None


@pytest.mark.asyncio
async def test_today_stats(client: AsyncClient):
    token = await _get_token(client)

    # Start and complete two sessions, interrupt one
    s1 = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    await client.post(f"/api/pomodoro/{s1.json()['id']}/complete", json={"interrupted": False}, headers=_auth(token))

    s2 = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    await client.post(f"/api/pomodoro/{s2.json()['id']}/complete", json={"interrupted": True}, headers=_auth(token))

    s3 = await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    # Leave s3 as current (not completed)

    stats_resp = await client.get("/api/pomodoro/today", headers=_auth(token))
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_sessions"] == 3
    assert stats["completed_sessions"] == 1  # only non-interrupted completed counts
    assert stats["total_minutes"] == 25
    assert stats["current_session"] is not None
    assert stats["current_session"]["id"] == s3.json()["id"]


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient):
    token = await _get_token(client)
    await client.post("/api/pomodoro/start", json={"duration_min": 25}, headers=_auth(token))
    await client.post("/api/pomodoro/start", json={"duration_min": 50}, headers=_auth(token))

    sessions_resp = await client.get("/api/pomodoro/sessions", headers=_auth(token))
    assert sessions_resp.status_code == 200
    assert len(sessions_resp.json()) >= 2


@pytest.mark.asyncio
async def test_start_session_with_task(client: AsyncClient):
    token = await _get_token(client)
    task_resp = await client.post(
        "/api/tasks",
        json={"title": "Focus Task", "quadrant": "urgent_important"},
        headers=_auth(token),
    )
    task_id = task_resp.json()["id"]

    start_resp = await client.post(
        "/api/pomodoro/start",
        json={"task_id": task_id, "duration_min": 25},
        headers=_auth(token),
    )
    assert start_resp.status_code == 201
    assert start_resp.json()["task_id"] == task_id
