from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_admin_endpoint_requires_authentication() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/admin/posts")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"
    assert response.json()["meta"]["requestId"].startswith("req_")


async def test_validation_errors_use_api_envelope() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "not-an-email", "password": "short"},
        )

    body = response.json()
    assert response.status_code == 422
    assert body["error"]["code"] == "VALIDATION_FAILED"
    assert len(body["error"]["details"]) == 2
