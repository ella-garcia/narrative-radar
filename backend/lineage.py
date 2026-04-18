"""Best-effort derivative spread enrichment."""

from __future__ import annotations

from dataclasses import dataclass

from .config import SETTINGS
from .ingest.yt_dlp_wrapper import all_demo_videos, find_demo_by_id
from .models import (
    DerivativeSpread,
    DerivativeVideoSummary,
    Platform,
    VideoMetadata,
)


@dataclass
class LineageProvider:
    name: str = "none"

    def fetch(self, metadata: VideoMetadata) -> DerivativeSpread:
        return DerivativeSpread(status="not_applicable", provider=self.name)


class NoLineageProvider(LineageProvider):
    name = "none"


class TikTokSoundLineageProvider(LineageProvider):
    name = "tiktok_sound"

    def fetch(self, metadata: VideoMetadata) -> DerivativeSpread:
        audio_id = metadata.audio_id
        if not audio_id:
            return DerivativeSpread(
                status="not_applicable",
                provider=self.name,
                error="No audio_id available for lineage expansion.",
            )

        demo_children = [
            d for d in all_demo_videos()
            if d.get("audio_id") == audio_id and d["video_id"] != metadata.video_id
        ]
        if demo_children:
            sample = [
                DerivativeVideoSummary(
                    video_id=d["video_id"],
                    url=d["url"],
                    author=d["author"],
                    title=d.get("title"),
                    language=d.get("language"),
                    view_count=int(d.get("view_count") or 0),
                    upload_date=None,
                    is_source=False,
                )
                for d in demo_children[: SETTINGS.lineage_max_derivatives]
            ]
            aggregate = sum(v.view_count for v in sample)
            return DerivativeSpread(
                status="complete",
                provider="demo",
                audio_id=audio_id,
                derivative_count=len(sample),
                aggregate_reach=aggregate,
                sample_videos=sample,
                root_proof_status=(
                    "proven" if metadata.is_explicit_root_source else "not_proven"
                ),
            )

        try:
            from TikTokApi import TikTokApi  # type: ignore[import-not-found]
        except ImportError:
            return DerivativeSpread(
                status="failed",
                provider=self.name,
                audio_id=audio_id,
                root_proof_status=(
                    "proven" if metadata.is_explicit_root_source else "not_proven"
                ),
                error="TikTokApi not installed.",
            )

        # Keep the production-risky branch intentionally narrow. The unofficial
        # client is only used as enrichment and failures should not block ingest.
        try:
            import asyncio

            async def _run() -> DerivativeSpread:
                async with TikTokApi() as api:
                    await api.create_sessions(headless=True, num_sessions=1)
                    sound = api.sound(id=audio_id)
                    sample: list[DerivativeVideoSummary] = []
                    async for video in sound.videos(count=SETTINGS.lineage_max_derivatives):
                        sample.append(
                            DerivativeVideoSummary(
                                video_id=str(getattr(video, "id", "")),
                                url=getattr(video, "url", "") or "",
                                author=getattr(getattr(video, "author", None), "username", "(unknown)"),
                                title=getattr(video, "title", None),
                                language=getattr(video, "language", None),
                                view_count=int(getattr(getattr(video, "stats", None), "play_count", 0) or 0),
                                upload_date=None,
                            )
                        )
                    return DerivativeSpread(
                        status="complete",
                        provider=self.name,
                        audio_id=audio_id,
                        derivative_count=len(sample),
                        aggregate_reach=sum(v.view_count for v in sample),
                        sample_videos=sample,
                        root_proof_status=(
                            "proven" if metadata.is_explicit_root_source else "not_proven"
                        ),
                    )

            return asyncio.run(_run())
        except Exception as exc:
            return DerivativeSpread(
                status="failed",
                provider=self.name,
                audio_id=audio_id,
                root_proof_status=(
                    "proven" if metadata.is_explicit_root_source else "not_proven"
                ),
                error=str(exc),
            )


def choose_provider(metadata: VideoMetadata) -> LineageProvider:
    if metadata.platform == Platform.tiktok and metadata.audio_id:
        return TikTokSoundLineageProvider()
    return NoLineageProvider()


def pending_for(metadata: VideoMetadata) -> DerivativeSpread:
    provider = choose_provider(metadata)
    if isinstance(provider, NoLineageProvider):
        return DerivativeSpread(status="not_applicable", provider=provider.name)
    return DerivativeSpread(
        status="pending",
        provider=provider.name,
        audio_id=metadata.audio_id,
        root_proof_status="proven" if metadata.is_explicit_root_source else "not_proven",
    )


def should_schedule(metadata: VideoMetadata, top_similarity: float | None) -> bool:
    return (
        metadata.platform == Platform.tiktok
        and bool(metadata.audio_id)
        and top_similarity is not None
        and top_similarity >= SETTINGS.lineage_match_trigger_threshold
    )
