"""End-to-end pipeline orchestrator: URL → AnalyzedVideo."""

from __future__ import annotations

from datetime import datetime, timezone

from .claims.gpt4o_extractor import extract_claims
from .compliance import art26_coord, art34_dsa, art50_ai
from .ingest.yt_dlp_wrapper import fetch_metadata, find_demo_by_id
from .match.matcher import best_cluster, match_claims
from .models import AnalyzedVideo, ComplianceGap
from .scoring.severity import score as severity_score
from . import storage
from .transcribe.whisperx_runner import transcribe_video


def analyze_url(url: str, constituency: str | None = None) -> AnalyzedVideo:
    metadata = fetch_metadata(url)

    transcript = transcribe_video(metadata.video_id, metadata.language)
    claims = extract_claims(transcript)
    matches = match_claims(claims)
    cluster, _ = best_cluster(claims)

    cross_refs = art34_dsa.cross_reference(metadata, cluster)

    # Synthetic-likelihood is metadata-only enrichment; comes from demo cache
    # in this build (Hive integration would slot in here).
    demo = find_demo_by_id(metadata.video_id) or {}
    synth = demo.get("demo_synthetic_likelihood")

    severity = severity_score(
        view_count=metadata.view_count,
        upload_date=metadata.upload_date,
        claim_count=len(claims),
        match_count=len(matches),
    )

    gaps: list[ComplianceGap] = []
    g50 = art50_ai.detect(metadata, matches, synth)
    if g50:
        gaps.append(g50)
    g34 = art34_dsa.detect(metadata, matches, cross_refs)
    if g34:
        gaps.append(g34)

    analysed = AnalyzedVideo(
        metadata=metadata,
        transcript=transcript,
        claims=claims,
        fact_check_matches=matches,
        dsa_tdb_cross_refs=cross_refs,
        compliance_gaps=gaps,
        severity=severity,
        synthetic_media_likelihood=synth,
        cluster_id=cluster,
        analyzed_at=datetime.now(tz=timezone.utc),
        constituency=constituency,
    )

    # Now check Art. 26 in the context of the corpus
    storage.upsert(analysed)
    g26 = art26_coord.detect(analysed, storage.all_videos())
    if g26:
        analysed.compliance_gaps.append(g26)
        storage.upsert(analysed)

    return analysed
