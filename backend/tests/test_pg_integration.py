import asyncio
import os
import sys
import uuid
from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select

from alembic import command
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.enums import UserStatus
from app.db.session import AsyncSessionFactory
from app.main import app
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.site.models import VisitorEvent

RUN_PG_INTEGRATION_TESTS = os.getenv("RUN_PG_INTEGRATION_TESTS") == "1"
pytestmark = pytest.mark.skipif(
    not RUN_PG_INTEGRATION_TESTS,
    reason="需要设置 RUN_PG_INTEGRATION_TESTS=1 并提供可销毁的 PostgreSQL 测试库",
)
BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module", autouse=True)
def migrated_database() -> Iterator[None]:
    settings = get_settings()
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    command.upgrade(alembic_config, "head")

    settings_id = uuid.uuid4()
    with psycopg.connect(
        host=settings.database_host,
        port=settings.database_port,
        dbname=settings.database_name,
        user=settings.database_user,
        password=settings.database_password.get_secret_value(),
        sslmode=settings.database_ssl_mode,
    ) as connection:
        connection.execute(
            """
            INSERT INTO site_settings (id, singleton_key, hero_title)
            VALUES (%s, %s, %s)
            ON CONFLICT (singleton_key)
            DO UPDATE SET hero_title = EXCLUDED.hero_title
            """,
            (settings_id, "pg-integration", "不设限，做唯一的自己。"),
        )

    command.downgrade(alembic_config, "-1")
    command.upgrade(alembic_config, "head")

    compatibility_user_id = uuid.uuid4()
    with psycopg.connect(
        host=settings.database_host,
        port=settings.database_port,
        dbname=settings.database_name,
        user=settings.database_user,
        password=settings.database_password.get_secret_value(),
        sslmode=settings.database_ssl_mode,
    ) as connection:
        column = connection.execute(
            """
            SELECT column_default, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'failed_login_attempts'
            """
        ).fetchone()
        assert column is not None
        assert column[0] is not None and "0" in str(column[0])
        assert column[1] == "NO"

        migrated_slogan = connection.execute(
            "SELECT hero_title FROM site_settings WHERE singleton_key = %s",
            ("pg-integration",),
        ).fetchone()
        assert migrated_slogan == ("不设限定，做唯一的自己。",)

        connection.execute(
            """
            INSERT INTO users (id, email, display_name, password_hash, status)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                compatibility_user_id,
                "old-image@example.com",
                "Old image",
                "not-used",
                UserStatus.ACTIVE.value,
            ),
        )
        attempts = connection.execute(
            "SELECT failed_login_attempts FROM users WHERE id = %s",
            (compatibility_user_id,),
        ).fetchone()
        assert attempts == (0,)
        connection.execute("DELETE FROM users WHERE id = %s", (compatibility_user_id,))

    yield

    with psycopg.connect(
        host=settings.database_host,
        port=settings.database_port,
        dbname=settings.database_name,
        user=settings.database_user,
        password=settings.database_password.get_secret_value(),
        sslmode=settings.database_ssl_mode,
    ) as connection:
        connection.execute(
            "DELETE FROM site_settings WHERE singleton_key = %s", ("pg-integration",)
        )


async def test_postgresql_analytics_aggregation_and_visit_deduplication() -> None:
    session_id = f"pg-{uuid.uuid4().hex}"
    async with AsyncSessionFactory() as session:
        await session.execute(delete(VisitorEvent))
        await session.commit()

    payload = {
        "sessionId": session_id,
        "path": "/posts/pg-integration",
        "deviceType": "desktop",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        first = await client.post("/api/v1/analytics/visit", json=payload)
        duplicate = await client.post("/api/v1/analytics/visit", json=payload)
        stats = await client.get("/api/v1/analytics/public?days=7")

    assert first.status_code == 204
    assert duplicate.status_code == 204
    assert stats.status_code == 200
    assert stats.json()["data"]["pageViews"] == 1
    assert stats.json()["data"]["visitors"] == 1

    async with AsyncSessionFactory() as session:
        count = await session.scalar(
            select(func.count(VisitorEvent.id)).where(VisitorEvent.session_id == session_id)
        )
        assert count == 1
        await session.execute(delete(VisitorEvent).where(VisitorEvent.session_id == session_id))
        await session.commit()


async def test_postgresql_login_lock_and_cli_unlock() -> None:
    user_id = uuid.uuid4()
    email = f"pg-{user_id.hex}@example.com"
    async with AsyncSessionFactory() as session:
        session.add(
            User(
                id=user_id,
                email=email,
                display_name="PG integration",
                password_hash=hash_password("correct-password-123"),
            )
        )
        await session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        responses = [
            await client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": "wrong-password-123"},
            )
            for _ in range(5)
        ]

    assert all(response.status_code == 401 for response in responses)
    async with AsyncSessionFactory() as session:
        locked_user = await session.get(User, user_id)
        assert locked_user is not None
        assert locked_user.status is UserStatus.LOCKED
        assert locked_user.failed_login_attempts == 5
        assert locked_user.locked_until is not None

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "app.cli",
        "unlock-admin",
        email,
        cwd=BACKEND_DIR,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    assert process.returncode == 0, stderr.decode()
    assert "Administrator unlocked." in stdout.decode()

    async with AsyncSessionFactory() as session:
        unlocked_user = await session.get(User, user_id)
        assert unlocked_user is not None
        assert unlocked_user.status is UserStatus.ACTIVE
        assert unlocked_user.failed_login_attempts == 0
        assert unlocked_user.locked_until is None
        await session.execute(delete(AuditLog).where(AuditLog.resource_id == user_id))
        await session.execute(delete(User).where(User.id == user_id))
        await session.commit()
