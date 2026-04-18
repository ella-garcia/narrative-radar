"""Shared provider utilities."""

from __future__ import annotations

import re
import time
from contextlib import contextmanager
from typing import Iterator

from ..models import ProviderStatus


class ProviderError(RuntimeError):
    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


class ProviderNotConfigured(ProviderError):
    def __init__(self, provider: str) -> None:
        super().__init__(f"{provider} is not configured.", retryable=False)


_SECRET_PATTERNS = [
    re.compile(r"(sk-[A-Za-z0-9_-]{12,})"),
    re.compile(r"([A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})"),
    re.compile(r"((?:api[_-]?key|token|authorization)=)[^&\s]+", re.IGNORECASE),
]


def redact(value: object) -> str:
    text = str(value)
    for pattern in _SECRET_PATTERNS:
        if pattern.groups >= 1:
            text = pattern.sub(lambda m: m.group(1) + "[REDACTED]" if m.lastindex and m.lastindex > 1 else "[REDACTED]", text)
    return text


@contextmanager
def timed_status(provider: str) -> Iterator[dict[str, object]]:
    started = time.perf_counter()
    payload: dict[str, object] = {"provider": provider}
    try:
        yield payload
        payload["status"] = "success"
    except ProviderNotConfigured as exc:
        payload["status"] = "not_configured"
        payload["error"] = redact(exc)
        raise
    except Exception as exc:
        payload["status"] = "failed"
        payload["error"] = redact(exc)
        raise
    finally:
        payload["latency_ms"] = round((time.perf_counter() - started) * 1000, 2)


def status(
    provider: str,
    state: str,
    *,
    request_id: str | None = None,
    error: object | None = None,
    latency_ms: float | None = None,
    raw_ref: str | None = None,
) -> ProviderStatus:
    return ProviderStatus(
        provider=provider,
        status=state,  # type: ignore[arg-type]
        request_id=request_id,
        error=redact(error) if error else None,
        latency_ms=latency_ms,
        raw_ref=raw_ref,
    )
