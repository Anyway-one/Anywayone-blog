import pytest

from app.core.rate_limit import SlidingWindowRateLimiter
from app.modules.auth.router import check_login_rate_limit


def test_sliding_window_rejects_and_then_expires_old_requests() -> None:
    limiter = SlidingWindowRateLimiter()

    assert limiter.allow("client", limit=2, window_seconds=10, now=0)
    assert limiter.allow("client", limit=2, window_seconds=10, now=1)
    assert not limiter.allow("client", limit=2, window_seconds=10, now=2)
    assert limiter.allow("client", limit=2, window_seconds=10, now=11)


def test_sliding_window_separates_keys() -> None:
    limiter = SlidingWindowRateLimiter()

    assert limiter.allow("ip:one", limit=1, window_seconds=10, now=0)
    assert not limiter.allow("ip:one", limit=1, window_seconds=10, now=1)
    assert limiter.allow("ip:two", limit=1, window_seconds=10, now=1)


def test_sliding_window_evicts_least_recent_key_at_capacity() -> None:
    limiter = SlidingWindowRateLimiter(max_keys=2)

    assert limiter.allow("oldest", limit=1, window_seconds=100, now=0)
    assert limiter.allow("newer", limit=1, window_seconds=100, now=1)
    assert limiter.allow("newest", limit=1, window_seconds=100, now=2)
    assert limiter.allow("oldest", limit=1, window_seconds=100, now=3)
    assert not limiter.allow("newest", limit=1, window_seconds=100, now=3)


def test_sliding_window_rejects_invalid_capacity() -> None:
    with pytest.raises(ValueError, match="max_keys"):
        SlidingWindowRateLimiter(max_keys=0)


def test_login_ip_rejection_does_not_consume_email_window() -> None:
    limiter = SlidingWindowRateLimiter()
    assert limiter.allow("ip:blocked", limit=1, window_seconds=300, now=0)

    ip_allowed, email_allowed = check_login_rate_limit(
        limiter,
        client_ip="blocked",
        email_key="target",
        ip_limit=1,
        email_limit=1,
        window_seconds=300,
        now=1,
    )

    assert not ip_allowed
    assert email_allowed
    assert limiter.allow("email:target", limit=1, window_seconds=300, now=1)
