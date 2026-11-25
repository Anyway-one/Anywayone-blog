from datetime import UTC, datetime, timedelta

from app.db.enums import UserStatus
from app.modules.auth.models import User
from app.modules.auth.service import register_failed_login


def test_failed_login_locks_user_at_configured_threshold() -> None:
    user = User(
        email="owner@example.com",
        display_name="Owner",
        password_hash="test-hash",  # noqa: S106
        status=UserStatus.ACTIVE,
        failed_login_attempts=4,
    )
    now = datetime(2026, 11, 25, tzinfo=UTC)

    reason = register_failed_login(user, now=now, failure_limit=5, lock_seconds=900)

    assert reason == "temporary_lock"
    assert user.status is UserStatus.LOCKED
    assert user.failed_login_attempts == 5
    assert user.locked_until == now + timedelta(seconds=900)


def test_failed_login_before_threshold_keeps_user_active() -> None:
    user = User(
        email="owner@example.com",
        display_name="Owner",
        password_hash="test-hash",  # noqa: S106
        status=UserStatus.ACTIVE,
        failed_login_attempts=0,
    )

    reason = register_failed_login(
        user,
        now=datetime(2026, 11, 25, tzinfo=UTC),
        failure_limit=5,
        lock_seconds=900,
    )

    assert reason == "invalid_credentials"
    assert user.status is UserStatus.ACTIVE
    assert user.failed_login_attempts == 1
    assert user.locked_until is None
