from fastapi import Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from app.main import api, app


async def test_admin_endpoint_requires_authentication() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/admin/posts")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"
    assert response.json()["meta"]["requestId"].startswith("req_")


async def test_cors_preflight_allows_admin_history_update() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/api/v1/admin/settings/history/634f52ea-2348-4dbb-b822-8fac6c7e99e3",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "PUT" in response.headers["Access-Control-Allow-Methods"]


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


async def test_unexpected_errors_keep_global_cors_headers() -> None:
    async def fail(_: Request) -> JSONResponse:
        raise RuntimeError("test failure")

    api.add_api_route("/_test/unexpected-error", fail, methods=["GET"])
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/_test/unexpected-error",
            headers={"Origin": "http://localhost:5173"},
        )

    assert response.status_code == 500
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response.headers["X-Request-Id"].startswith("req_")
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
