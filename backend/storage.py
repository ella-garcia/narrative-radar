"""In-process JSON store for analysed videos. Hackathon-grade: a single
process holds the dict in memory and writes-through to a JSON file on every
mutation. No DB engine, no lock contention, no setup."""

from __future__ import annotations

import json
import threading
from pathlib import Path

from .models import AnalyzedVideo

DATA_DIR = Path(__file__).resolve().parent / "data"
STORE_FILE = DATA_DIR / "processed_videos.json"

_LOCK = threading.RLock()
_STORE: dict[str, AnalyzedVideo] = {}
_LOADED = False


def _load_from_disk() -> None:
    global _LOADED
    if _LOADED:
        return
    if STORE_FILE.exists():
        try:
            raw = json.loads(STORE_FILE.read_text())
            for entry in raw:
                v = AnalyzedVideo.model_validate(entry)
                _STORE[v.metadata.video_id] = v
        except Exception:
            # Corrupt file — start clean rather than crash the API.
            _STORE.clear()
    _LOADED = True


def _flush() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORE_FILE.write_text(
        json.dumps(
            [v.model_dump(mode="json") for v in _STORE.values()],
            ensure_ascii=False,
            indent=2,
        )
    )


def upsert(v: AnalyzedVideo) -> None:
    with _LOCK:
        _load_from_disk()
        _STORE[v.metadata.video_id] = v
        _flush()


def get(video_id: str) -> AnalyzedVideo | None:
    with _LOCK:
        _load_from_disk()
        return _STORE.get(video_id)


def all_videos() -> list[AnalyzedVideo]:
    with _LOCK:
        _load_from_disk()
        return list(_STORE.values())


def clear() -> None:
    with _LOCK:
        _STORE.clear()
        if STORE_FILE.exists():
            STORE_FILE.unlink()
