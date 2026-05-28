import pytest
from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_provider(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post(
        "/api/ai-providers",
        json={"name": "DeepSeek", "base_url": "https://api.deepseek.com/v1", "api_key": "sk-test", "model_name": "deepseek-chat"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "DeepSeek"
    assert data["model_name"] == "deepseek-chat"
    assert "api_key_enc" not in data
    assert "api_key" not in data


@pytest.mark.asyncio
async def test_list_providers(client: AsyncClient):
    token = await _get_token(client)
    await client.post(
        "/api/ai-providers",
        json={"name": "P1", "base_url": "https://example.com", "model_name": "gpt-4"},
        headers=_auth(token),
    )
    await client.post(
        "/api/ai-providers",
        json={"name": "P2", "base_url": "https://example.com", "model_name": "gpt-3.5"},
        headers=_auth(token),
    )
    resp = await client.get("/api/ai-providers", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_update_provider(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post(
        "/api/ai-providers",
        json={"name": "Old", "base_url": "https://example.com", "model_name": "m1"},
        headers=_auth(token),
    )
    pid = create_resp.json()["id"]
    resp = await client.patch(
        f"/api/ai-providers/{pid}",
        json={"name": "New"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New"


@pytest.mark.asyncio
async def test_delete_provider(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post(
        "/api/ai-providers",
        json={"name": "ToDelete", "base_url": "https://example.com", "model_name": "m1"},
        headers=_auth(token),
    )
    pid = create_resp.json()["id"]
    resp = await client.delete(f"/api/ai-providers/{pid}", headers=_auth(token))
    assert resp.status_code == 204
    list_resp = await client.get("/api/ai-providers", headers=_auth(token))
    ids = [p["id"] for p in list_resp.json()]
    assert pid not in ids


@pytest.mark.asyncio
async def test_set_default_exclusivity(client: AsyncClient):
    token = await _get_token(client)
    r1 = await client.post(
        "/api/ai-providers",
        json={"name": "A", "base_url": "https://example.com", "model_name": "m1", "is_default": True},
        headers=_auth(token),
    )
    r2 = await client.post(
        "/api/ai-providers",
        json={"name": "B", "base_url": "https://example.com", "model_name": "m2"},
        headers=_auth(token),
    )
    pid1 = r1.json()["id"]
    pid2 = r2.json()["id"]

    # Set B as default
    resp = await client.post(f"/api/ai-providers/{pid2}/set-default", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    # A should no longer be default
    list_resp = await client.get("/api/ai-providers", headers=_auth(token))
    providers = {p["id"]: p for p in list_resp.json()}
    assert providers[pid1]["is_default"] is False
    assert providers[pid2]["is_default"] is True
