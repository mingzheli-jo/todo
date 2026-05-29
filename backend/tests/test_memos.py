import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_list_memo(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/memos", json={"content": "买牛奶"}, headers=_auth(token))
    assert resp.status_code == 201
    assert resp.json()["content"] == "买牛奶"
    assert resp.json()["is_done"] is False

    listed = await client.get("/api/memos", headers=_auth(token))
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.asyncio
async def test_mark_done_sets_done_at(client: AsyncClient):
    token = await _get_token(client)
    created = await client.post("/api/memos", json={"content": "写周报"}, headers=_auth(token))
    memo_id = created.json()["id"]

    done = await client.patch(f"/api/memos/{memo_id}", json={"is_done": True}, headers=_auth(token))
    assert done.status_code == 200
    assert done.json()["is_done"] is True
    assert done.json()["done_at"] is not None

    # open filter should now exclude it
    open_list = await client.get("/api/memos?status=open", headers=_auth(token))
    assert len(open_list.json()) == 0
    all_list = await client.get("/api/memos?status=all", headers=_auth(token))
    assert len(all_list.json()) == 1


@pytest.mark.asyncio
async def test_delete_memo(client: AsyncClient):
    token = await _get_token(client)
    created = await client.post("/api/memos", json={"content": "临时"}, headers=_auth(token))
    memo_id = created.json()["id"]
    resp = await client.delete(f"/api/memos/{memo_id}", headers=_auth(token))
    assert resp.status_code == 204
    listed = await client.get("/api/memos?status=all", headers=_auth(token))
    assert len(listed.json()) == 0


@pytest.mark.asyncio
async def test_convert_memo_to_task(client: AsyncClient):
    token = await _get_token(client)
    created = await client.post("/api/memos", json={"content": "准备演讲稿"}, headers=_auth(token))
    memo_id = created.json()["id"]

    resp = await client.post(
        f"/api/memos/{memo_id}/convert",
        json={"quadrant": "important"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["title"] == "准备演讲稿"
    assert data["task"]["quadrant"] == "important"
    assert data["memo"]["is_done"] is True
    assert data["memo"]["task_id"] == data["task"]["id"]

    # the converted task should exist in tasks list
    tasks = await client.get("/api/tasks", headers=_auth(token))
    assert any(t["id"] == data["task"]["id"] for t in tasks.json())
