"""TikAPI paid TikTok lineage adapter."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from ..config import SETTINGS, live_provider_calls_allowed
from ..models import DerivativeSpread, DerivativeVideoSummary, VideoMetadata
from .base import ProviderNotConfigured


def fetch_music_posts(metadata: VideoMetadata) -> DerivativeSpread:
    if not SETTINGS.tikapi_key or not live_provider_calls_allowed():
        raise ProviderNotConfigured("tikapi")
    if not metadata.audio_id:
        return DerivativeSpread(status="not_applicable", provider="tikapi")

    sample: list[DerivativeVideoSummary] = []
    cursor: str | None = None
    with httpx.Client(timeout=30) as client:
        while len(sample) < SETTINGS.lineage_max_derivatives:
            params = {
                "id": metadata.audio_id,
                "count": min(30, SETTINGS.lineage_max_derivatives - len(sample)),
            }
            if cursor:
                params["cursor"] = cursor
            resp = client.get(
                "https://api.tikapi.io/public/music",
                headers={"X-API-KEY": SETTINGS.tikapi_key},
                params=params,
            )
            resp.raise_for_status()
            payload = resp.json()
            items = _items(payload)
            if not items:
                break
            for item in items:
                child = _child(item)
                if child.video_id and child.video_id != metadata.video_id:
                    sample.append(child)
                if len(sample) >= SETTINGS.lineage_max_derivatives:
                    break
            cursor = str(payload.get("cursor") or payload.get("nextCursor") or "")
            if not cursor or not payload.get("hasMore", payload.get("has_more", False)):
                break

    return DerivativeSpread(
        status="complete",
        provider="tikapi",
        audio_id=metadata.audio_id,
        derivative_count=len(sample),
        aggregate_reach=sum(v.view_count for v in sample),
        sample_videos=sample,
        root_proof_status="proven" if metadata.is_explicit_root_source else "not_proven",
    )


def _items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("itemList") or payload.get("items")
    if isinstance(data, list):
        return data
    nested = payload.get("data")
    if isinstance(nested, dict):
        videos = nested.get("videos") or nested.get("itemList") or nested.get("items")
        if isinstance(videos, list):
            return videos
    return []


def _child(item: dict[str, Any]) -> DerivativeVideoSummary:
    stats = item.get("stats") or item.get("statsV2") or {}
    author = item.get("author") or {}
    video_id = str(item.get("id") or item.get("video_id") or "")
    create_time = item.get("createTime") or item.get("create_time")
    upload_date = None
    if create_time:
        try:
            upload_date = datetime.fromtimestamp(int(create_time), tz=timezone.utc)
        except (TypeError, ValueError):
            upload_date = None
    return DerivativeVideoSummary(
        video_id=video_id,
        url=f"https://www.tiktok.com/@{author.get('uniqueId') or author.get('username', 'unknown')}/video/{video_id}",
        author="@" + str(author.get("uniqueId") or author.get("username") or item.get("username") or "unknown").lstrip("@"),
        title=item.get("desc") or item.get("title"),
        language=item.get("textLanguage") or item.get("language"),
        view_count=int(stats.get("playCount") or stats.get("play_count") or 0),
        upload_date=upload_date,
    )
