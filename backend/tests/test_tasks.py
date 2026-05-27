import pytest
from httpx import AsyncClient

async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/tasks", json={"title": "Test task", "quadrant": "urgent_important"}, headers=_auth(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test task"
    assert data["quadrant"] == "urgent_important"
    assert data["status"] == "todo"

@pytest.mark.asyncio
async def test_list_tasks_by_quadrant(client: AsyncClient):
    token = await _get_token(client)
    await client.post("/api/tasks", json={"title": "Q1", "quadrant": "urgent_important"}, headers=_auth(token))
    await client.post("/api/tasks", json={"title": "Q2", "quadrant": "important"}, headers=_auth(token))
    resp = await client.get("/api/tasks?quadrant=urgent_important", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Q1"

@pytest.mark.asyncio
async def test_update_task_to_done(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/tasks", json={"title": "Finish me"}, headers=_auth(token))
    task_id = create_resp.json()["id"]
    resp = await client.patch(f"/api/tasks/{task_id}", json={"status": "done"}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    assert resp.json()["completed_at"] is not None

@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/tasks", json={"title": "Delete me"}, headers=_auth(token))
    task_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/tasks/{task_id}", headers=_auth(token))
    assert resp.status_code == 204
    resp = await client.get(f"/api/tasks/{task_id}", headers=_auth(token))
    assert resp.status_code == 404
