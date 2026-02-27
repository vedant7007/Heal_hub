import asyncio
import time
from collections import defaultdict, deque
from collections.abc import Callable


class SlidingWindowRateLimiter:
    def __init__(self, now_fn: Callable[[], float] | None = None):
        self._now = now_fn or time.monotonic
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = self._now()
        cutoff = now - window_seconds

        async with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                return False

            bucket.append(now)
            return True


def get_client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
