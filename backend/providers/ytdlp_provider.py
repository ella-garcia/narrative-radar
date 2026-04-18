"""yt-dlp URL extraction adapter."""

from __future__ import annotations

from typing import Any

from .base import ProviderNotConfigured


def extract_info(url: str, *, download: bool = False) -> dict[str, Any]:
    try:
        import yt_dlp  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ProviderNotConfigured("yt-dlp") from exc

    with yt_dlp.YoutubeDL(
        {
            "skip_download": not download,
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }
    ) as ydl:
        info = ydl.extract_info(url, download=download)
        return ydl.sanitize_info(info)
