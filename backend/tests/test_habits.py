import pytest
from datetime import date, timedelta
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_habit(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post(
        "/api/habits",
        json={"name": "Morning Run", "icon": "🏃", "color": "#ef4444", "frequency": "daily"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Morning Run"
    assert data["icon"] == "🏃"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_list_habits(client: AsyncClient):
    token = await _get_token(client)
    await client.post("/api/habits", json={"name": "Read"}, headers=_auth(token))
    await client.post("/api/habits", json={"name": "Meditate"}, headers=_auth(token))
    resp = await client.get("/api/habits", headers=_auth(token))
    assert resp.status_code == 200
    names = [h["name"] for h in resp.json()]
    assert "Read" in names
    assert "Meditate" in names


@pytest.mark.asyncio
async def test_check_in_habit_today(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/habits", json={"name": "Drink Water"}, headers=_auth(token))
    habit_id = create_resp.json()["id"]

    checkin_resp = await client.post(
        f"/api/habits/{habit_id}/check-in",
        json={"completed": True, "note": "8 glasses"},
        headers=_auth(token),
    )
    assert checkin_resp.status_code == 200
    record = checkin_resp.json()
    assert record["completed"] is True
    assert record["note"] == "8 glasses"
    assert record["habit_id"] == habit_id


@pytest.mark.asyncio
async def test_check_in_upsert(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/habits", json={"name": "Exercise"}, headers=_auth(token))
    habit_id = create_resp.json()["id"]
    today = date.today().isoformat()

    # First check-in
    await client.post(
        f"/api/habits/{habit_id}/check-in",
        json={"date": today, "completed": True},
        headers=_auth(token),
    )
    # Second check-in same day (upsert — should update, not duplicate)
    resp2 = await client.post(
        f"/api/habits/{habit_id}/check-in",
        json={"date": today, "completed": False, "note": "skipped"},
        headers=_auth(token),
    )
    assert resp2.status_code == 200
    assert resp2.json()["completed"] is False
    assert resp2.json()["note"] == "skipped"

    # Records should only have one entry for today
    records_resp = await client.get(
        f"/api/habits/{habit_id}/records",
        params={"start_date": today, "end_date": today},
        headers=_auth(token),
    )
    assert len(records_resp.json()) == 1


@pytest.mark.asyncio
async def test_today_endpoint(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/habits", json={"name": "Journal"}, headers=_auth(token))
    habit_id = create_resp.json()["id"]

    today_resp = await client.get("/api/habits/today", headers=_auth(token))
    assert today_resp.status_code == 200
    items = today_resp.json()
    habit_ids = [item["habit"]["id"] for item in items]
    assert habit_id in habit_ids

    # Before check-in: completed_today is False
    item = next(i for i in items if i["habit"]["id"] == habit_id)
    assert item["completed_today"] is False

    # Check in
    await client.post(f"/api/habits/{habit_id}/check-in", json={"completed": True}, headers=_auth(token))

    today_resp2 = await client.get("/api/habits/today", headers=_auth(token))
    item2 = next(i for i in today_resp2.json() if i["habit"]["id"] == habit_id)
    assert item2["completed_today"] is True


@pytest.mark.asyncio
async def test_habit_records_range(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/habits", json={"name": "Stretch"}, headers=_auth(token))
    habit_id = create_resp.json()["id"]

    today = date.today()
    yesterday = (today - timedelta(days=1)).isoformat()
    today_str = today.isoformat()

    await client.post(
        f"/api/habits/{habit_id}/check-in",
        json={"date": yesterday, "completed": True},
        headers=_auth(token),
    )
    await client.post(
        f"/api/habits/{habit_id}/check-in",
        json={"date": today_str, "completed": True},
        headers=_auth(token),
    )

    records_resp = await client.get(
        f"/api/habits/{habit_id}/records",
        params={"start_date": yesterday, "end_date": today_str},
        headers=_auth(token),
    )
    assert records_resp.status_code == 200
    assert len(records_resp.json()) == 2


@pytest.mark.asyncio
async def test_soft_delete_habit_with_records(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/habits", json={"name": "ToDelete"}, headers=_auth(token))
    habit_id = create_resp.json()["id"]

    # Add a record so soft-delete triggers
    await client.post(f"/api/habits/{habit_id}/check-in", json={"completed": True}, headers=_auth(token))

    del_resp = await client.delete(f"/api/habits/{habit_id}", headers=_auth(token))
    assert del_resp.status_code == 204

    # Habit still exists but is inactive
    get_resp = await client.get(f"/api/habits/{habit_id}", headers=_auth(token))
    assert get_resp.status_code == 200
    assert get_resp.json()["is_active"] is False

    # Not in active list
    list_resp = await client.get("/api/habits", headers=_auth(token))
    ids = [h["id"] for h in list_resp.json()]
    assert habit_id not in ids
