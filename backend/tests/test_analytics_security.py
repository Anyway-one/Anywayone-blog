import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import Request
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

import app.core.request_client as request_client
from app.core.request_client import get_client_ip, get_trusted_location
from app.modules.site.schemas import VisitorEventInput
from app.modules.site.service import (
    build_visitor_summary_statement,
    build_visitor_trend_statement,
    record_visitor_event,
)


def _request(headers: list[tuple[bytes, bytes]]) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": headers,
            "client": ("10.0.0.2", 1234),
            "server": ("test", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )


def test_proxy_headers_are_ignored_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        request_client,
        "get_settings",
        lambda: SimpleNamespace(trusted_proxy_headers=False),
    )
    request = _request([(b"cf-connecting-ip", b"203.0.113.8"), (b"cf-ipcountry", b"CN")])

    assert get_client_ip(request) == "10.0.0.2"
    assert get_trusted_location(request) == (None, None, None)


def test_proxy_headers_are_used_only_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        request_client,
        "get_settings",
        lambda: SimpleNamespace(trusted_proxy_headers=True),
    )
    request = _request([(b"cf-connecting-ip", b"203.0.113.8"), (b"cf-ipcountry", b"CN")])

    assert get_client_ip(request) == "203.0.113.8"
    assert get_trusted_location(request) == ("CN", None, None)


def test_analytics_queries_aggregate_in_postgresql() -> None:
    since = datetime(2026, 11, 1, tzinfo=UTC)
    today_start = datetime(2026, 11, 25, tzinfo=UTC)
    summary_sql = str(
        build_visitor_summary_statement(since=since, today_start=today_start).compile(
            dialect=postgresql.dialect()
        )
    ).lower()
    trend_sql = str(
        build_visitor_trend_statement(since=since).compile(dialect=postgresql.dialect())
    ).lower()

    assert "count(distinct" in summary_sql
    assert "date_trunc" in trend_sql
    assert "group by" in trend_sql


class _DuplicateDb:
    added = False
    committed = False

    async def scalar(self, _statement: object) -> uuid.UUID:
        return uuid.uuid4()

    def add(self, _item: object) -> None:
        self.added = True

    async def commit(self) -> None:
        self.committed = True


async def test_duplicate_visit_is_not_written() -> None:
    fake_db = _DuplicateDb()
    recorded = await record_visitor_event(
        cast(AsyncSession, fake_db),
        VisitorEventInput(session_id="session-123", path="/posts/hello"),
        _request([]),
    )

    assert not recorded
    assert not fake_db.added
    assert not fake_db.committed
