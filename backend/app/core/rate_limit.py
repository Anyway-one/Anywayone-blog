from collections import deque
from threading import Lock
from time import monotonic


class SlidingWindowRateLimiter:
    """A small per-process sliding-window limiter for public endpoints."""

    def __init__(self, *, max_keys: int = 10_000) -> None:
        if max_keys < 1:
            raise ValueError("max_keys must be at least 1")
        self._events: dict[str, deque[float]] = {}
        self._last_seen: dict[str, float] = {}
        self._lock = Lock()
        self._last_cleanup: float | None = None
        self._max_keys = max_keys

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
                self._remove_expired(cutoff)
                self._last_cleanup = current
            events = self._events.get(key)
            if events is None:
                self._make_room(cutoff)
                events = deque[float]()
                self._events[key] = events
            self._last_seen[key] = current
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(current)
            return True

    def _remove_expired(self, cutoff: float) -> None:
        for existing_key, existing_events in list(self._events.items()):
            while existing_events and existing_events[0] <= cutoff:
                existing_events.popleft()
            if not existing_events:
                self._events.pop(existing_key, None)
                self._last_seen.pop(existing_key, None)

    def _make_room(self, cutoff: float) -> None:
        if len(self._events) < self._max_keys:
            return
        self._remove_expired(cutoff)
        if len(self._events) < self._max_keys:
            return
        oldest_key = min(self._events, key=self._last_seen.__getitem__)
        self._events.pop(oldest_key, None)
        self._last_seen.pop(oldest_key, None)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()
            self._last_seen.clear()
            self._last_cleanup = None
