import asyncio

from app.utils.rate_limit import SlidingWindowRateLimiter


def test_sliding_window_allows_within_limit():
    now = 100.0
    limiter = SlidingWindowRateLimiter(now_fn=lambda: now)

    assert asyncio.run(limiter.allow("k", 2, 60)) is True
    assert asyncio.run(limiter.allow("k", 2, 60)) is True
    assert asyncio.run(limiter.allow("k", 2, 60)) is False


def test_sliding_window_expires_old_events():
    current = {"t": 100.0}
    limiter = SlidingWindowRateLimiter(now_fn=lambda: current["t"])

    assert asyncio.run(limiter.allow("k", 1, 10)) is True
    assert asyncio.run(limiter.allow("k", 1, 10)) is False

    current["t"] = 111.0
    assert asyncio.run(limiter.allow("k", 1, 10)) is True
