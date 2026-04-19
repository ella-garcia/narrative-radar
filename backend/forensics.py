"""Read-only forensic analysis over the already analysed video corpus.

Phase 1 deliberately avoids new scraping, account monitoring, snapshots, or
external provider calls. Every signal is computed from `storage.all_videos()`.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from statistics import median

from .models import (
    AmplificationEdge,
    AnalyzedVideo,
    ForensicAccountSummary,
    ForensicProfile,
    ForensicSignal,
    NarrativeTrendPoint,
)

CAVEAT = (
    "Investigative signal only. Does not identify a bot, coordinated actor, "
    "or legal violation without human review."
)


def list_accounts(videos: list[AnalyzedVideo]) -> list[ForensicAccountSummary]:
    summaries = [_summary(handle, group) for handle, group in _by_author(videos).items()]
    summaries.sort(key=lambda s: (s.total_reach, s.video_count), reverse=True)
    return summaries


def account_profile(videos: list[AnalyzedVideo], handle: str) -> ForensicProfile | None:
    author_groups = _by_author(videos)
    matched_handle = _find_handle(author_groups, handle)
    if matched_handle is None:
        return None

    account_videos = sorted(
        author_groups[matched_handle],
        key=lambda v: v.metadata.upload_date,
    )
    edges = [
        edge
        for edge in amplification_edges(videos)
        if edge.source_handle == matched_handle or edge.related_handle == matched_handle
    ]
    signals = _signals_for_account(account_videos, videos, edges)
    missing = [
        "Account creation date is unavailable in Phase 1 corpus-only analysis.",
        "Follower/following growth history is unavailable in Phase 1 corpus-only analysis.",
        "Username history and cross-platform identity reuse are unavailable without authorized historical snapshots.",
    ]

    return ForensicProfile(
        summary=_summary(matched_handle, account_videos),
        posting_cadence=_posting_cadence(account_videos),
        hashtag_counts=dict(_hashtag_counts(account_videos)),
        narrative_clusters=dict(_cluster_counts(account_videos)),
        engagement_stats=_engagement_stats(account_videos),
        amplification_edges=edges,
        signals=signals,
        missing_data_notes=missing,
    )


def narrative_trends(videos: list[AnalyzedVideo]) -> list[NarrativeTrendPoint]:
    buckets: dict[tuple[str, str | None, str | None, str | None], dict] = {}
    for video in videos:
        date_bucket = video.metadata.upload_date.date().isoformat()
        cluster = video.cluster_id or "unclustered"
        hashtags = video.metadata.hashtags or [None]
        for hashtag in hashtags:
            key = (
                date_bucket,
                cluster,
                video.metadata.language,
                hashtag.lower() if isinstance(hashtag, str) else None,
            )
            current = buckets.setdefault(
                key,
                {
                    "video_count": 0,
                    "total_reach": 0,
                    "handles": set(),
                },
            )
            current["video_count"] += 1
            current["total_reach"] += video.metadata.view_count
            current["handles"].add(video.metadata.author)

    points = [
        NarrativeTrendPoint(
            date_bucket=date_bucket,
            cluster_id=cluster,
            language=language,
            hashtag=hashtag,
            video_count=payload["video_count"],
            total_reach=payload["total_reach"],
            handles=sorted(payload["handles"]),
        )
        for (date_bucket, cluster, language, hashtag), payload in buckets.items()
    ]
    points.sort(key=lambda p: (p.date_bucket, p.total_reach), reverse=True)
    return points


def amplification_edges(videos: list[AnalyzedVideo]) -> list[AmplificationEdge]:
    edges: list[AmplificationEdge] = []
    seen: set[tuple[str, str, str, str]] = set()

    audio_groups: dict[str, list[AnalyzedVideo]] = defaultdict(list)
    for video in videos:
        if video.metadata.audio_id:
            audio_groups[video.metadata.audio_id].append(video)
    for audio_id, group in audio_groups.items():
        if len(group) < 2:
            continue
        for source in group:
            for related in group:
                if source.metadata.author == related.metadata.author:
                    continue
                key = (
                    source.metadata.author,
                    related.metadata.author,
                    "shared_audio",
                    audio_id,
                )
                if key in seen:
                    continue
                seen.add(key)
                edges.append(
                    AmplificationEdge(
                        source_handle=source.metadata.author,
                        related_handle=related.metadata.author,
                        relation_type="shared_audio",
                        shared_evidence={
                            "audio_id": audio_id,
                            "source_video_id": source.metadata.video_id,
                            "related_video_id": related.metadata.video_id,
                        },
                    )
                )

    for video in videos:
        spread = video.derivative_spread
        if spread.status != "complete":
            continue
        for child in spread.sample_videos:
            if not child.author or child.author == video.metadata.author:
                continue
            key = (
                video.metadata.author,
                child.author,
                "derivative_spread",
                child.video_id,
            )
            if key in seen:
                continue
            seen.add(key)
            edges.append(
                AmplificationEdge(
                    source_handle=video.metadata.author,
                    related_handle=child.author,
                    relation_type="derivative_spread",
                    shared_evidence={
                        "audio_id": spread.audio_id,
                        "source_video_id": video.metadata.video_id,
                        "related_video_id": child.video_id,
                        "aggregate_reach": spread.aggregate_reach,
                    },
                )
            )

    cluster_groups: dict[str, list[AnalyzedVideo]] = defaultdict(list)
    for video in videos:
        if video.cluster_id:
            cluster_groups[video.cluster_id].append(video)
    for cluster_id, group in cluster_groups.items():
        for source in group:
            for related in group:
                if source.metadata.author == related.metadata.author:
                    continue
                if abs(source.metadata.upload_date - related.metadata.upload_date) > timedelta(days=7):
                    continue
                key = (
                    source.metadata.author,
                    related.metadata.author,
                    "same_cluster_window",
                    cluster_id,
                )
                if key in seen:
                    continue
                seen.add(key)
                edges.append(
                    AmplificationEdge(
                        source_handle=source.metadata.author,
                        related_handle=related.metadata.author,
                        relation_type="same_cluster_window",
                        shared_evidence={
                            "cluster_id": cluster_id,
                            "source_video_id": source.metadata.video_id,
                            "related_video_id": related.metadata.video_id,
                            "window_days": 7,
                        },
                    )
                )

    edges.sort(key=lambda e: (e.relation_type, e.source_handle, e.related_handle))
    return edges


def _by_author(videos: list[AnalyzedVideo]) -> dict[str, list[AnalyzedVideo]]:
    groups: dict[str, list[AnalyzedVideo]] = defaultdict(list)
    for video in videos:
        groups[video.metadata.author].append(video)
    return dict(groups)


def _find_handle(groups: dict[str, list[AnalyzedVideo]], handle: str) -> str | None:
    normalized = _normalize_handle(handle)
    for existing in groups:
        if _normalize_handle(existing) == normalized:
            return existing
    return None


def _normalize_handle(handle: str) -> str:
    return handle.strip().lower().lstrip("@")


def _summary(handle: str, videos: list[AnalyzedVideo]) -> ForensicAccountSummary:
    uploads = [v.metadata.upload_date for v in videos]
    return ForensicAccountSummary(
        handle=handle,
        platforms=sorted({v.metadata.platform.value for v in videos}),
        video_count=len(videos),
        languages=sorted({v.metadata.language for v in videos}),
        first_observed_upload=min(uploads) if uploads else None,
        last_observed_upload=max(uploads) if uploads else None,
        total_reach=sum(v.metadata.view_count for v in videos),
        known_clusters=sorted({v.cluster_id for v in videos if v.cluster_id}),
    )


def _posting_cadence(videos: list[AnalyzedVideo]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for video in videos:
        dt = video.metadata.upload_date
        counts[f"{dt.strftime('%a')} {dt.hour:02d}:00"] += 1
    return dict(sorted(counts.items()))


def _hashtag_counts(videos: list[AnalyzedVideo]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for video in videos:
        counts.update(tag.lower() for tag in video.metadata.hashtags)
    return counts


def _cluster_counts(videos: list[AnalyzedVideo]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for video in videos:
        counts.update([video.cluster_id or "unclustered"])
    return counts


def _engagement_stats(videos: list[AnalyzedVideo]) -> dict:
    views = [v.metadata.view_count for v in videos]
    likes = [v.metadata.like_count for v in videos if v.metadata.like_count is not None]
    total_views = sum(views)
    total_likes = sum(likes)
    return {
        "video_count": len(videos),
        "total_views": total_views,
        "median_views": median(views) if views else 0,
        "max_views": max(views) if views else 0,
        "total_likes": total_likes,
        "like_rate": (total_likes / total_views) if total_views else None,
    }


def _signals_for_account(
    account_videos: list[AnalyzedVideo],
    all_videos: list[AnalyzedVideo],
    edges: list[AmplificationEdge],
) -> list[ForensicSignal]:
    signals: list[ForensicSignal] = [
        ForensicSignal(
            signal_type="missing_data",
            severity="informational",
            title="Account history unavailable",
            description=(
                "Phase 1 only uses videos already analysed by Narrative Radar. "
                "Account creation date, username history, and follower growth are not inferred."
            ),
            evidence={
                "unavailable_fields": [
                    "account_created_at",
                    "username_history",
                    "follower_growth_curve",
                ]
            },
        )
    ]

    if len(account_videos) >= 3:
        first = account_videos[0].metadata.upload_date
        last = account_videos[-1].metadata.upload_date
        if (last - first) <= timedelta(days=7):
            signals.append(
                ForensicSignal(
                    signal_type="posting_burst",
                    severity="medium",
                    title="Posting burst in stored corpus",
                    description=(
                        f"{len(account_videos)} analysed videos from this handle "
                        "fall within a seven-day window."
                    ),
                    evidence={
                        "video_ids": [v.metadata.video_id for v in account_videos],
                        "window_start": first.isoformat(),
                        "window_end": last.isoformat(),
                    },
                )
            )

    stats = _engagement_stats(account_videos)
    if stats["max_views"] and stats["median_views"] and stats["max_views"] >= stats["median_views"] * 5:
        signals.append(
            ForensicSignal(
                signal_type="engagement_anomaly",
                severity="low",
                title="Reach outlier in stored corpus",
                description=(
                    "One analysed video has substantially higher views than this "
                    "handle's median analysed-video reach."
                ),
                evidence={
                    "max_views": stats["max_views"],
                    "median_views": stats["median_views"],
                },
            )
        )

    if any(edge.relation_type in {"shared_audio", "derivative_spread"} for edge in edges):
        signals.append(
            ForensicSignal(
                signal_type="shared_audio_amplification",
                severity="medium",
                title="Shared-audio amplification link",
                description=(
                    "This handle is connected to another analysed handle or derivative "
                    "video through a shared audio identifier."
                ),
                evidence={"edge_count": len(edges)},
            )
        )

    account_clusters = {v.cluster_id for v in account_videos if v.cluster_id}
    for cluster in account_clusters:
        languages = {
            v.metadata.language
            for v in all_videos
            if v.cluster_id == cluster
        }
        if len(languages) >= 2:
            signals.append(
                ForensicSignal(
                    signal_type="cross_language_cluster",
                    severity="medium",
                    title="Cross-language narrative cluster",
                    description=(
                        "This handle appears in a narrative cluster that also appears "
                        "in other languages in the analysed corpus."
                    ),
                    evidence={
                        "cluster_id": cluster,
                        "languages": sorted(languages),
                    },
                )
            )

    clusters_by_time = [
        v.cluster_id for v in account_videos if v.cluster_id
    ]
    if len(set(clusters_by_time)) >= 2:
        signals.append(
            ForensicSignal(
                signal_type="narrative_shift",
                severity="low",
                title="Multiple narrative clusters observed",
                description=(
                    "The analysed videos from this handle span multiple narrative "
                    "clusters. Phase 1 reports this as a descriptive shift, not intent."
                ),
                evidence={"clusters": sorted(set(clusters_by_time))},
            )
        )

    return signals
