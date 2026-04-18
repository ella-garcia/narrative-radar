"""Controlled temporary media download and extraction."""

from __future__ import annotations

import shutil
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

from ..config import SETTINGS, live_provider_calls_allowed
from .base import ProviderError, ProviderNotConfigured


@dataclass
class MediaArtifacts:
    workdir: Path
    video_path: Path | None = None
    audio_path: Path | None = None
    frame_paths: list[Path] | None = None

    def cleanup(self) -> None:
        if self.workdir.exists():
            shutil.rmtree(self.workdir, ignore_errors=True)


def download_media(url: str) -> MediaArtifacts:
    if not SETTINGS.enable_media_downloads or not live_provider_calls_allowed():
        raise ProviderNotConfigured("media_downloads")
    try:
        import yt_dlp  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ProviderNotConfigured("yt-dlp") from exc

    workdir = SETTINGS.media_tmp_dir / str(uuid.uuid4())
    workdir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(workdir / "source.%(ext)s")
    try:
        with yt_dlp.YoutubeDL(
            {
                "outtmpl": outtmpl,
                "quiet": True,
                "no_warnings": True,
                "format": "mp4/bestvideo+bestaudio/best",
                "noplaylist": True,
            }
        ) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
        path = Path(filename)
        if not path.exists():
            candidates = sorted(workdir.glob("source.*"))
            path = candidates[0] if candidates else path
        if not path.exists():
            raise ProviderError("yt-dlp did not produce a media file.", retryable=True)
        return MediaArtifacts(workdir=workdir, video_path=path, frame_paths=[])
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise


def extract_audio(artifacts: MediaArtifacts) -> Path:
    if not artifacts.video_path:
        raise ProviderError("No video artifact available for audio extraction.")
    audio = artifacts.workdir / "audio.m4a"
    _run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(artifacts.video_path),
            "-vn",
            "-acodec",
            "aac",
            str(audio),
        ]
    )
    artifacts.audio_path = audio
    return audio


def extract_frames(artifacts: MediaArtifacts, *, fps: float = 0.2, limit: int = 8) -> list[Path]:
    if not artifacts.video_path:
        raise ProviderError("No video artifact available for frame extraction.")
    frame_dir = artifacts.workdir / "frames"
    frame_dir.mkdir(exist_ok=True)
    _run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(artifacts.video_path),
            "-vf",
            f"fps={fps}",
            str(frame_dir / "frame-%03d.jpg"),
        ]
    )
    frames = sorted(frame_dir.glob("frame-*.jpg"))[:limit]
    artifacts.frame_paths = frames
    return frames


def _run_ffmpeg(args: list[str]) -> None:
    if not shutil.which(args[0]):
        raise ProviderNotConfigured("ffmpeg")
    proc = subprocess.run(args, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise ProviderError(proc.stderr.strip() or "ffmpeg failed.", retryable=True)
