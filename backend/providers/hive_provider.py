"""Hive synthetic-media detection adapter."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from ..config import SETTINGS, live_provider_calls_allowed
from .base import ProviderNotConfigured, ProviderError


def detect_synthetic_media(media_path: Path | None = None, media_url: str | None = None) -> tuple[float | None, dict[str, Any]]:
    if not _configured() or not live_provider_calls_allowed():
        raise ProviderNotConfigured("hive")
    if not media_path and not media_url:
        raise ProviderError("Hive requires either a media file or media URL.")

    headers = _headers()
    data: dict[str, str] = {}
    files = None
    if media_url:
        data["url"] = media_url
    if media_path:
        files = {"media": (media_path.name, media_path.open("rb"), "application/octet-stream")}

    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                SETTINGS.hive_api_base_url,
                headers=headers,
                data=data,
                files=files,
            )
            resp.raise_for_status()
            payload = resp.json()
    finally:
        if files:
            files["media"][1].close()

    return _synthetic_score(payload), payload


def _configured() -> bool:
    return bool(SETTINGS.hive_api_key or (SETTINGS.hive_access_id and SETTINGS.hive_secret_key))


def _headers() -> dict[str, str]:
    if SETTINGS.hive_access_id and SETTINGS.hive_secret_key:
        secret = SETTINGS.hive_secret_key
        scheme = SETTINGS.hive_secret_key_scheme.strip()
        secret_value = f"{scheme} {secret}" if scheme else secret
        return {
            SETTINGS.hive_access_id_header: SETTINGS.hive_access_id,
            SETTINGS.hive_secret_key_header: secret_value,
        }
    if SETTINGS.hive_api_key:
        return {"Authorization": f"Token {SETTINGS.hive_api_key}"}
    raise ProviderNotConfigured("hive")


def _synthetic_score(payload: dict[str, Any]) -> float | None:
    scores: list[float] = []

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            label = str(node.get("class") or node.get("label") or node.get("name") or "").lower()
            score = node.get("score")
            if any(k in label for k in ("ai", "generated", "deepfake", "synthetic")):
                try:
                    scores.append(float(score))
                except (TypeError, ValueError):
                    pass
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(payload)
    return max(scores) if scores else None
