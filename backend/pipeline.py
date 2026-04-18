"""End-to-end pipeline orchestrator: URL -> AnalyzedVideo."""

from __future__ import annotations

from datetime import datetime, timezone

from . import storage
from .claims.gpt4o_extractor import extract_claims
from .compliance import art26_coord, art34_dsa, art50_ai
from .ingest.yt_dlp_wrapper import fetch_metadata, find_demo_by_id
from .lineage import choose_provider, pending_for, should_schedule
from .match.matcher import best_cluster, match_claims
from .models import AnalyzedVideo, ComplianceGap, DerivativeSpread
from .ocr import extract_ocr
from .providers.base import status as provider_status
from .providers.media import MediaArtifacts, download_media, extract_audio, extract_frames
from .scoring.severity import score as severity_score
from .transcribe.whisperx_runner import transcribe_video


def analyze_url(url: str, constituency: str | None = None) -> AnalyzedVideo:
    metadata = fetch_metadata(url)
    provider_statuses = {}
    demo = find_demo_by_id(metadata.video_id) or {}
    artifacts: MediaArtifacts | None = None
    audio_path = None
    frame_paths = None
    try:
        if not demo:
            try:
                artifacts = download_media(url)
                provider_statuses["media"] = provider_status("yt-dlp", "success")
                try:
                    audio_path = extract_audio(artifacts)
                    provider_statuses["audio_extract"] = provider_status("ffmpeg", "success")
                except Exception as exc:
                    provider_statuses["audio_extract"] = provider_status("ffmpeg", "failed", error=exc)
                try:
                    frame_paths = extract_frames(artifacts)
                    provider_statuses["frame_extract"] = provider_status("ffmpeg", "success")
                except Exception as exc:
                    provider_statuses["frame_extract"] = provider_status("ffmpeg", "failed", error=exc)
            except Exception as exc:
                provider_statuses["media"] = provider_status("yt-dlp", "skipped", error=exc)

        transcript = transcribe_video(metadata.video_id, metadata.language, audio_path)
        provider_statuses["transcription"] = provider_status(
            "demo" if demo else "openai", "success"
        )
        ocr_result = extract_ocr(metadata, frame_paths)
        provider_statuses["ocr"] = provider_status(ocr_result.provider, ocr_result.status if ocr_result.status != "complete" else "success", error=ocr_result.error)
        claims = extract_claims(transcript, ocr_result.blocks)
        provider_statuses["claims"] = provider_status(
            "openai" if not demo else "demo_or_fallback", "success"
        )
        matches = match_claims(claims)
        cluster, _ = best_cluster(claims)

        synth = _synthetic_likelihood(metadata, demo, artifacts)
        if synth is not None and not demo:
            provider_statuses["hive"] = provider_status("hive", "success")
    finally:
        if artifacts:
            artifacts.cleanup()

    derivative_spread = _initial_derivative_spread(metadata, matches)

    analysed = AnalyzedVideo(
        metadata=metadata,
        transcript=transcript,
        claims=claims,
        fact_check_matches=matches,
        dsa_tdb_cross_refs=[],
        compliance_gaps=[],
        severity=_placeholder_severity(metadata),
        synthetic_media_likelihood=synth,
        derivative_spread=derivative_spread,
        ocr_result=ocr_result,
        provider_statuses=provider_statuses,
        cluster_id=cluster,
        analyzed_at=datetime.now(tz=timezone.utc),
        constituency=constituency,
    )

    analysed = _recompute(analysed, storage.all_videos())
    storage.upsert(analysed)
    return analysed


def _synthetic_likelihood(metadata, demo, artifacts: MediaArtifacts | None) -> float | None:
    if demo:
        return demo.get("demo_synthetic_likelihood")
    try:
        from .providers.hive_provider import detect_synthetic_media

        media_path = artifacts.video_path if artifacts else None
        score, _payload = detect_synthetic_media(media_path=media_path, media_url=metadata.url)
        return score
    except Exception:
        return None


def enrich_lineage(video_id: str) -> AnalyzedVideo | None:
    video = storage.get(video_id)
    if not video:
        return None
    provider = choose_provider(video.metadata)
    video.derivative_spread = provider.fetch(video.metadata)
    refreshed = _recompute(video, storage.all_videos())
    storage.upsert(refreshed)
    return refreshed


def _initial_derivative_spread(
    metadata,
    matches,
) -> DerivativeSpread:
    top_similarity = matches[0].similarity if matches else None
    if should_schedule(metadata, top_similarity):
        return pending_for(metadata)
    return DerivativeSpread(
        status="not_applicable",
        provider="none",
        audio_id=metadata.audio_id,
        root_proof_status="proven" if metadata.is_explicit_root_source else "not_proven",
    )


def _placeholder_severity(metadata) -> object:
    return severity_score(
        view_count=metadata.view_count,
        upload_date=metadata.upload_date,
        claim_count=0,
        match_count=0,
    )


def _recompute(video: AnalyzedVideo, all_videos: list[AnalyzedVideo]) -> AnalyzedVideo:
    cross_refs = art34_dsa.cross_reference(video.metadata, video.cluster_id)
    severity = severity_score(
        view_count=video.metadata.view_count,
        upload_date=video.metadata.upload_date,
        claim_count=len(video.claims),
        match_count=len(video.fact_check_matches),
        derivative_spread=video.derivative_spread,
        is_explicit_root_source=video.metadata.is_explicit_root_source,
    )

    gaps: list[ComplianceGap] = []
    g50 = art50_ai.detect(video.metadata, video.fact_check_matches, video.synthetic_media_likelihood)
    if g50:
        gaps.append(g50)
    g34 = art34_dsa.detect(
        video.metadata,
        video.fact_check_matches,
        cross_refs,
        video.derivative_spread,
    )
    if g34:
        gaps.append(g34)

    candidate = video.model_copy(
        update={
            "dsa_tdb_cross_refs": cross_refs,
            "compliance_gaps": gaps,
            "severity": severity,
        }
    )

    # Re-evaluate Art. 26 in the context of the full corpus including the
    # candidate's updated lineage state.
    peers = [v for v in all_videos if v.metadata.video_id != candidate.metadata.video_id]
    g26 = art26_coord.detect(candidate, peers + [candidate])
    if g26:
        candidate.compliance_gaps.append(g26)
    return candidate
