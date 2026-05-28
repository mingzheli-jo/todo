import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_objective(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "Grow Revenue", "period": "2026-Q2"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "objective"
    assert data["title"] == "Grow Revenue"
    assert data["period"] == "2026-Q2"
    assert data["progress"] == 0
    assert data["status"] == "active"
    assert data["children"] == []


@pytest.mark.asyncio
async def test_create_key_result_under_objective(client: AsyncClient):
    token = await _get_token(client)
    obj_resp = await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "Obj 1", "period": "2026-Q2"},
        headers=_auth(token),
    )
    obj_id = obj_resp.json()["id"]

    kr_resp = await client.post(
        "/api/okrs",
        json={"type": "key_result", "title": "KR 1", "period": "2026-Q2", "parent_id": obj_id},
        headers=_auth(token),
    )
    assert kr_resp.status_code == 201
    kr = kr_resp.json()
    assert kr["type"] == "key_result"
    assert kr["parent_id"] == obj_id


@pytest.mark.asyncio
async def test_update_kr_progress_rolls_up_to_objective(client: AsyncClient):
    token = await _get_token(client)
    obj_resp = await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "Obj Progress", "period": "2026-Q2"},
        headers=_auth(token),
    )
    obj_id = obj_resp.json()["id"]

    kr1 = await client.post(
        "/api/okrs",
        json={"type": "key_result", "title": "KR A", "period": "2026-Q2", "parent_id": obj_id},
        headers=_auth(token),
    )
    kr2 = await client.post(
        "/api/okrs",
        json={"type": "key_result", "title": "KR B", "period": "2026-Q2", "parent_id": obj_id},
        headers=_auth(token),
    )

    # Update KR1 to 60, KR2 to 40 → avg = 50
    await client.patch(f"/api/okrs/{kr1.json()['id']}", json={"progress": 60}, headers=_auth(token))
    await client.patch(f"/api/okrs/{kr2.json()['id']}", json={"progress": 40}, headers=_auth(token))

    obj_detail = await client.get(f"/api/okrs/{obj_id}", headers=_auth(token))
    assert obj_detail.status_code == 200
    assert obj_detail.json()["progress"] == 50


@pytest.mark.asyncio
async def test_list_okrs_filter_by_period(client: AsyncClient):
    token = await _get_token(client)
    await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "Q1 OKR", "period": "2026-Q1"},
        headers=_auth(token),
    )
    await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "Q2 OKR", "period": "2026-Q2"},
        headers=_auth(token),
    )
    resp = await client.get("/api/okrs?period=2026-Q1", headers=_auth(token))
    assert resp.status_code == 200
    titles = [o["title"] for o in resp.json()]
    assert "Q1 OKR" in titles
    assert "Q2 OKR" not in titles


@pytest.mark.asyncio
async def test_link_task_to_okr(client: AsyncClient):
    token = await _get_token(client)
    # Create a task first
    task_resp = await client.post(
        "/api/tasks",
        json={"title": "Task for OKR", "quadrant": "important"},
        headers=_auth(token),
    )
    task_id = task_resp.json()["id"]

    okr_resp = await client.post(
        "/api/okrs",
        json={"type": "key_result", "title": "KR Link Test", "period": "2026-Q2"},
        headers=_auth(token),
    )
    okr_id = okr_resp.json()["id"]

    link_resp = await client.post(f"/api/okrs/{okr_id}/link-task/{task_id}", headers=_auth(token))
    assert link_resp.status_code == 204

    # List OKRs for the task
    task_okrs = await client.get(f"/api/okrs/tasks/{task_id}/okrs", headers=_auth(token))
    assert task_okrs.status_code == 200
    assert any(o["id"] == okr_id for o in task_okrs.json())

    # Unlink
    unlink_resp = await client.delete(f"/api/okrs/{okr_id}/link-task/{task_id}", headers=_auth(token))
    assert unlink_resp.status_code == 204

    task_okrs2 = await client.get(f"/api/okrs/tasks/{task_id}/okrs", headers=_auth(token))
    assert task_okrs2.json() == []


@pytest.mark.asyncio
async def test_delete_okr(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post(
        "/api/okrs",
        json={"type": "objective", "title": "To Delete", "period": "2026-Q3"},
        headers=_auth(token),
    )
    okr_id = resp.json()["id"]
    del_resp = await client.delete(f"/api/okrs/{okr_id}", headers=_auth(token))
    assert del_resp.status_code == 204
    get_resp = await client.get(f"/api/okrs/{okr_id}", headers=_auth(token))
    assert get_resp.status_code == 404
