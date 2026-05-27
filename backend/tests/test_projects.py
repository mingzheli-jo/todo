import pytest
from httpx import AsyncClient

async def _get_token(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    token = await _get_token(client)
    resp = await client.post("/api/projects", json={"name": "My Project"}, headers=_auth(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Project"
    assert data["pdca_phase"] == "plan"
    assert data["pdca_cycle"] == 1

@pytest.mark.asyncio
async def test_pdca_advance_full_cycle(client: AsyncClient):
    token = await _get_token(client)
    create_resp = await client.post("/api/projects", json={"name": "PDCA Test"}, headers=_auth(token))
    pid = create_resp.json()["id"]
    for expected_phase in ["do", "check", "act", "plan"]:
        resp = await client.post(f"/api/projects/{pid}/pdca/advance", json={"content": "Phase work done"}, headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["pdca_phase"] == expected_phase
    assert resp.json()["pdca_cycle"] == 2
    logs_resp = await client.get(f"/api/projects/{pid}/pdca/logs", headers=_auth(token))
    assert logs_resp.status_code == 200
    assert len(logs_resp.json()) == 4
