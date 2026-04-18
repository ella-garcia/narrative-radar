"""YouTube Data API metadata helper for opt-in live enrichment/tests."""

from __future__ import annotations

from typing import Any

import httpx

from ..config import SETTINGS, live_provider_calls_allowed
from .base import ProviderNotConfigured


def videos_list(video_ids: list[str]) -> dict[str, Any]:
    if not SETTINGS.youtube_api_key or not live_provider_calls_allowed():
        raise ProviderNotConfigured("youtube")
    resp = httpx.get(
        "https://www.googleapis.com/youtube/v3/videos",
        params={
            "key": SETTINGS.youtube_api_key,
            "part": "snippet,contentDetails,statistics,status",
            "id": ",".join(video_ids),
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


def search_short_videos(query: str, *, max_results: int = 5) -> dict[str, Any]:
    if not SETTINGS.youtube_api_key or not live_provider_calls_allowed():
        raise ProviderNotConfigured("youtube")
    resp = httpx.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={
            "key": SETTINGS.youtube_api_key,
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoDuration": "short",
            "maxResults": max_results,
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()
