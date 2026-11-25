from app.core.rate_limit import SlidingWindowRateLimiter


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
