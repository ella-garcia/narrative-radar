"""DSA Art. 26 — coordinated spread indicator (cross-account, cross-language).

Operates on the SET of analysed videos in storage. Triggers when, for the
same narrative cluster, ≥ N distinct accounts post within a window of D days.
The cross-language variant — same narrative, ≥ 2 distinct languages —
elevates severity to high.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Iterable

from ..config import SETTINGS
from ..models import AnalyzedVideo, ComplianceGap


def detect(
    target: AnalyzedVideo, all_videos: Iterable[AnalyzedVideo]
) -> ComplianceGap | None:
    lineage = target.derivative_spread
    if target.cluster_id is None:
        if not (lineage and lineage.status == "complete"):
            return None
        distinct_authors = {target.metadata.author}
        distinct_languages = {target.metadata.language}
        for child in lineage.sample_videos:
            if child.author:
                distinct_authors.add(child.author)
            if child.language:
                distinct_languages.add(child.language)
        if len(distinct_authors) < SETTINGS.art26_min_accounts:
            return None
        cross_lang = len(distinct_languages) >= 2
        severity = "high" if cross_lang else "medium"
        return ComplianceGap(
            article_ref="DSA Art. 26",
            article_short=(
                "Coordinated cross-language spread"
                if cross_lang
                else "Coordinated spread"
            ),
            severity=severity,
            description=(
                f"Derivative reuse of the same audio appears across "
                f"{len(distinct_authors)} distinct accounts"
                + (
                    f", spanning {len(distinct_languages)} languages "
                    f"({', '.join(sorted(distinct_languages))})."
                    if cross_lang
                    else "."
                )
                + " This pattern is consistent with coordinated reproduction "
                "and may indicate a mitigation gap under Art. 26."
            ),
            evidence={
                "cluster_id": None,
                "audio_id": lineage.audio_id,
                "distinct_accounts": sorted(distinct_authors),
                "distinct_languages": sorted(distinct_languages),
                "window_days": SETTINGS.art26_window_days,
                "video_ids_in_cluster": [target.metadata.video_id]
                + [v.video_id for v in lineage.sample_videos],
                "cross_language": cross_lang,
                "derivative_count": lineage.derivative_count,
                "aggregate_reach": lineage.aggregate_reach,
            },
        )

    window = timedelta(days=SETTINGS.art26_window_days)
    same_cluster = [
        v for v in all_videos if v.cluster_id == target.cluster_id
    ]
    if len(same_cluster) < SETTINGS.art26_min_accounts:
        return None

    # Filter to a temporal window around the target
    in_window = [
        v
        for v in same_cluster
        if abs(
            (v.metadata.upload_date - target.metadata.upload_date)
        ) <= window
    ]
    distinct_authors = {v.metadata.author for v in in_window}
    distinct_languages = {v.metadata.language for v in in_window}
    if len(distinct_authors) < SETTINGS.art26_min_accounts:
        return None

    cross_lang = len(distinct_languages) >= 2
    severity = "high" if cross_lang else "medium"

    evidence = {
        "cluster_id": target.cluster_id,
        "distinct_accounts": sorted(distinct_authors),
        "distinct_languages": sorted(distinct_languages),
        "window_days": SETTINGS.art26_window_days,
        "video_ids_in_cluster": [v.metadata.video_id for v in in_window],
        "cross_language": cross_lang,
    }
    description = (
        f"The same narrative cluster appears across "
        f"{len(distinct_authors)} distinct accounts within a "
        f"{SETTINGS.art26_window_days}-day window"
        + (
            f", spanning {len(distinct_languages)} languages "
            f"({', '.join(sorted(distinct_languages))})."
            if cross_lang
            else "."
        )
        + " This pattern is consistent with coordinated reproduction and "
        "may indicate a transparency or recommender-system mitigation gap "
        "under Art. 26."
    )
    if lineage and lineage.status == "complete":
        evidence["derivative_spread_radius"] = {
            "audio_id": lineage.audio_id,
            "derivative_count": lineage.derivative_count,
            "aggregate_reach": lineage.aggregate_reach,
        }
        description += (
            f" The same audio is also reused in {lineage.derivative_count} "
            f"derivative video(s) with aggregate reach {lineage.aggregate_reach:,}."
        )

    return ComplianceGap(
        article_ref="DSA Art. 26",
        article_short=(
            "Coordinated cross-language spread"
            if cross_lang
            else "Coordinated spread"
        ),
        severity=severity,
        description=description,
        evidence=evidence,
    )


def cluster_summary(
    all_videos: list[AnalyzedVideo],
) -> list[dict]:
    """Aggregate by cluster_id for the dashboard cluster bubble map."""
    by_cluster: dict[str, list[AnalyzedVideo]] = defaultdict(list)
    for v in all_videos:
        if v.cluster_id is None:
            continue
        by_cluster[v.cluster_id].append(v)

    out = []
    for cid, vs in by_cluster.items():
        out.append(
            {
                "cluster_id": cid,
                "languages": sorted({v.metadata.language for v in vs}),
                "video_ids": [v.metadata.video_id for v in vs],
                "total_reach": sum(v.metadata.view_count for v in vs),
                "max_severity": max(v.severity.score for v in vs),
                "article_refs": sorted(
                    {g.article_ref for v in vs for g in v.compliance_gaps}
                ),
            }
        )
    out.sort(key=lambda x: x["max_severity"], reverse=True)
    return out
