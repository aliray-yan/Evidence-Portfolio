from collections import defaultdict, deque
from time import monotonic


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, limit: int, per_seconds: int = 60) -> bool:
        now = monotonic()
        bucket = self._events[key]
        while bucket and now - bucket[0] >= per_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True


rate_limiter = InMemoryRateLimiter()
