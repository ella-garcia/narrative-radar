"""yt-dlp metadata + media ingestion. Falls back to a pre-cached demo dataset
when yt-dlp is not installed or the URL matches a demo case."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from ..models import Platform, VideoMetadata

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_demo() -> list[dict[str, Any]]:
    with (DATA_DIR / "demo_videos.json").open() as f:
        return json.load(f)


DEMO_VIDEOS = _load_demo()
DEMO_BY_URL = {v["url"]: v for v in DEMO_VIDEOS}
DEMO_BY_ID = {v["video_id"]: v for v in DEMO_VIDEOS}


def _platform_from_url(url: str) -> Platform:
    u = url.lower()
    if "tiktok.com" in u:
        return Platform.tiktok
    if "youtube.com/shorts" in u or "/shorts/" in u:
        return Platform.youtube_shorts
    if "youtube.com" in u or "youtu.be" in u:
        return Platform.youtube
    if "instagram.com" in u:
        return Platform.instagram
    if "twitter.com" in u or "x.com" in u:
        return Platform.twitter
    return Platform.other


def fetch_metadata(url: str) -> VideoMetadata:
    """Return platform metadata for a URL.

    Resolution order:
      1. Pre-cached demo case → returned synchronously, no network.
      2. yt-dlp with `skip_download=True` → real metadata.
      3. ImportError fallback → minimal stub indicating live ingestion is
         unavailable in this deployment (still permits the rest of the
         pipeline to run on uploader-supplied transcripts).
    """
    if url in DEMO_BY_URL:
        return _demo_to_metadata(DEMO_BY_URL[url])

    try:
        from ..providers.ytdlp_provider import extract_info
        info = extract_info(url, download=False)
    except Exception:
        raise RuntimeError(
            "yt-dlp not installed and URL not in demo cache. "
            "Install yt-dlp or add the URL to backend/data/demo_videos.json."
        )
    return _ytdlp_to_metadata(url, info)


def _demo_to_metadata(d: dict[str, Any]) -> VideoMetadata:
    return VideoMetadata(
        video_id=d["video_id"],
        url=d["url"],
        platform=Platform(d["platform"]),
        title=d["title"],
        author=d["author"],
        upload_date=datetime.fromisoformat(d["upload_date"].replace("Z", "+00:00")),
        view_count=d["view_count"],
        like_count=d.get("like_count"),
        duration_sec=d.get("duration_sec"),
        hashtags=d.get("hashtags", []),
        language=d["language"],
        has_platform_ai_label=d.get("has_platform_ai_label", False),
        description=d.get("description", ""),
        audio_id=d.get("audio_id"),
        audio_url=d.get("audio_url"),
        lineage_source_kind=d.get("lineage_source_kind"),
        is_explicit_root_source=bool(d.get("is_explicit_root_source", False)),
    )


def _ytdlp_to_metadata(url: str, info: dict[str, Any]) -> VideoMetadata:
    upload_str = info.get("upload_date") or info.get("release_date")
    upload = (
        datetime.strptime(upload_str, "%Y%m%d") if upload_str else datetime.utcnow()
    )
    tags = info.get("tags") or []
    music = info.get("music")
    audio_id = info.get("track_id")
    if not audio_id and isinstance(music, dict):
        audio_id = music.get("id")
    audio_url = None
    if audio_id:
        audio_url = f"https://www.tiktok.com/music/{audio_id}"
    return VideoMetadata(
        video_id=str(info.get("id") or url),
        url=url,
        platform=_platform_from_url(url),
        title=info.get("title") or "(no title)",
        author=info.get("uploader") or info.get("channel") or "(unknown)",
        upload_date=upload,
        view_count=int(info.get("view_count") or 0),
        like_count=int(info.get("like_count")) if info.get("like_count") else None,
        duration_sec=float(info.get("duration") or 0) or None,
        hashtags=[f"#{t}" for t in tags if isinstance(t, str)],
        language=(info.get("language") or "en")[:2],
        has_platform_ai_label=bool(info.get("ai_generated") or False),
        description=info.get("description") or "",
        audio_id=str(audio_id) if audio_id else None,
        audio_url=audio_url,
        lineage_source_kind="audio" if audio_id else None,
        is_explicit_root_source=bool(
            info.get("is_original_sound")
            or info.get("original")
            or info.get("is_original_audio")
        ),
    )


def find_demo_by_id(video_id: str) -> dict[str, Any] | None:
    return DEMO_BY_ID.get(video_id)


def all_demo_videos() -> list[dict[str, Any]]:
    return list(DEMO_VIDEOS)


def demo_transcript_segments(demo: dict[str, Any]) -> list[dict[str, Any]]:
    """Return transcript segments from an inline fixture or an external file.

    New demo videos can keep large transcripts in
    backend/data/demo_transcripts/<video_id>.json and point to them with:

        "transcript_path": "demo_transcripts/<video_id>.json"

    The external file may be either a JSON list of segments or an object with a
    top-level "segments" list.
    """
    if "transcript_segments" in demo:
        return demo["transcript_segments"]

    transcript_path = demo.get("transcript_path")
    if not transcript_path:
        video_id = demo.get("video_id", "(unknown)")
        raise RuntimeError(
            f"Demo video_id={video_id} has no transcript_segments or transcript_path."
        )

    path = _safe_data_path(str(transcript_path))
    try:
        payload = json.loads(path.read_text())
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"Demo transcript file not found for video_id={demo.get('video_id')}: "
            f"{transcript_path}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Demo transcript file is not valid JSON for video_id={demo.get('video_id')}: "
            f"{transcript_path}"
        ) from exc

    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("segments"), list):
        return payload["segments"]

    raise RuntimeError(
        f"Demo transcript file for video_id={demo.get('video_id')} must contain "
        "a JSON list of segments or an object with a segments list."
    )


def _safe_data_path(relative_path: str) -> Path:
    path = (DATA_DIR / relative_path).resolve()
    data_root = DATA_DIR.resolve()
    if data_root not in path.parents and path != data_root:
        raise RuntimeError(f"Demo data path escapes backend/data: {relative_path}")
    return path
