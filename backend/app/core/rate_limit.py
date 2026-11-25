from collections import defaultdict, deque
from threading import Lock
from time import monotonic


class SlidingWindowRateLimiter:
    """A small per-process sliding-window limiter for public endpoints."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._last_cleanup: float | None = None

    def allow(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
        now: float | None = None,
    ) -> bool:
        current = monotonic() if now is None else now
        cutoff = current - window_seconds
        with self._lock:
            if self._last_cleanup is None:
                self._last_cleanup = current
            if current - self._last_cleanup >= min(window_seconds, 60):
                for existing_key, existing_events in list(self._events.items()):
                    while existing_events and existing_events[0] <= cutoff:
                        existing_events.popleft()
                    if not existing_events:
                        self._events.pop(existing_key, None)
                self._last_cleanup = current
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(current)
            return True

    def clear(self) -> None:
        with self._lock:
            self._events.clear()
            self._last_cleanup = None
