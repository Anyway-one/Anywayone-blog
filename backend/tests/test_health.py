from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_live_health_returns_request_id() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/health/live", headers={"X-Request-Id": "req_test"})

    assert response.status_code == 200
    assert response.headers["X-Request-Id"] == "req_test"
    assert response.json() == {
        "data": {"status": "ok", "database": None},
        "meta": {"requestId": "req_test"},
    }
