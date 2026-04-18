"""Whisper / WhisperX transcription. Demo cases ship with pre-computed
transcripts so the live demo never depends on a GPU or model download.

In production, swap `transcribe_url` with a faster-whisper or WhisperX call.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from ..ingest.yt_dlp_wrapper import demo_transcript_segments, find_demo_by_id

from ..models import Transcript

LOW_CONFIDENCE_LANGS = {"ru", "uk", "be", "bg", "sr", "zh", "ro"}


def _confidence_for(lang: str) -> tuple[Literal["high", "medium", "low"], str | None]:
    if lang in {"ru", "uk", "be", "zh"}:
        return "low", (
            f"ASR + LLM extraction quality is reduced for '{lang}'. "
            "Mandatory human review before action."
        )
    if lang in {"bg", "sr", "ro"}:
        return "medium", (
            f"ASR + LLM extraction quality is reduced for '{lang}'. "
            "Human review recommended."
        )
    return "high", None


def transcribe_video(
    video_id: str,
    language: str,
    audio_path: Path | None = None,
) -> Transcript:
    demo = find_demo_by_id(video_id)
    if demo is None and audio_path is not None:
        try:
            from ..providers.openai_provider import transcribe
            return transcribe(audio_path, language)
        except Exception:
            pass
    if demo is None:
        raise RuntimeError(
            f"No pre-computed transcript for video_id={video_id} "
            "and live transcription is not configured in this build."
        )

    segments = demo_transcript_segments(demo)
    full = " ".join(s["text"] for s in segments)
    conf, warning = _confidence_for(language)
    return Transcript(
        language=language,
        segments=segments,
        full_text=full,
        confidence=conf,
        low_confidence_warning=warning,
    )
