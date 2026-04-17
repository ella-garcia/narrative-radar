from datetime import datetime, timezone

from backend.compliance import art26_coord, art34_dsa, art50_ai
from backend.models import (
    AnalyzedVideo,
    Claim,
    ComplianceGap,
    DSATDBCrossReference,
    FactCheckMatch,
    Platform,
    SeverityScore,
    Transcript,
    VideoMetadata,
)


def _metadata(**overrides):
    defaults = dict(
        video_id="t1",
        url="https://www.tiktok.com/@x/video/1",
        platform=Platform.tiktok,
        title="t",
        author="@x",
        upload_date=datetime.now(tz=timezone.utc),
        view_count=100_000,
        like_count=1000,
        duration_sec=60,
        hashtags=[],
        language="en",
        has_platform_ai_label=False,
        description="",
    )
    defaults.update(overrides)
    return VideoMetadata(**defaults)


def _transcript(text="t"):
    return Transcript(
        language="en",
        segments=[{"start": 0, "end": 1, "speaker": "S0", "text": text}],
        full_text=text,
        confidence="high",
        low_confidence_warning=None,
    )


# -----------------------------------------------------------------------------
# Art. 50
# -----------------------------------------------------------------------------


def test_art50_fires_on_synthetic_likelihood_without_label():
    m = _metadata()
    gap = art50_ai.detect(m, matches=[], synthetic_likelihood=0.95)
    assert gap is not None
    assert gap.article_ref == "AI Act Art. 50"


def test_art50_does_not_fire_when_platform_label_present():
    m = _metadata(has_platform_ai_label=True)
    gap = art50_ai.detect(m, matches=[], synthetic_likelihood=0.99)
    assert gap is None


def test_art50_does_not_fire_on_benign_content():
    m = _metadata()
    gap = art50_ai.detect(m, matches=[], synthetic_likelihood=0.1)
    assert gap is None


def test_art50_fires_on_uploader_declared_hashtag():
    m = _metadata(hashtags=["#AIgenerated", "#fun"])
    gap = art50_ai.detect(m, matches=[], synthetic_likelihood=None)
    assert gap is not None


def test_art50_carries_disclaimer():
    m = _metadata()
    gap = art50_ai.detect(m, matches=[], synthetic_likelihood=0.95)
    assert gap is not None
    assert "legal determination" in gap.disclaimer


# -----------------------------------------------------------------------------
# Art. 34-35
# -----------------------------------------------------------------------------


def test_art34_fires_when_match_and_tdb_crossref_present():
    m = _metadata(platform=Platform.tiktok)
    fcmatch = FactCheckMatch(
        factcheck_id="evd-2024-ro-georgescu-nato-puppet",
        title="t", summary="s", source="EUvsDisinfo",
        source_url="https://example.test/a", publication_date="2024-11-01",
        languages_documented=["ro"], similarity=0.81,
    )
    refs = art34_dsa.cross_reference(m, "ro_election_2024")
    assert refs, "expected DSA TDB seed to cover ro_election_2024 for tiktok"
    gap = art34_dsa.detect(m, [fcmatch], refs)
    assert gap is not None
    assert gap.article_ref == "DSA Art. 34-35"


def test_art34_does_not_fire_without_match():
    m = _metadata(platform=Platform.tiktok)
    refs = art34_dsa.cross_reference(m, "ro_election_2024")
    gap = art34_dsa.detect(m, matches=[], cross_refs=refs)
    assert gap is None


def test_art34_does_not_fire_without_tdb_crossref():
    m = _metadata()
    fcmatch = FactCheckMatch(
        factcheck_id="fc1", title="t", summary="s", source="s",
        source_url="u", publication_date="2024-01-01",
        languages_documented=["en"], similarity=0.8,
    )
    gap = art34_dsa.detect(m, [fcmatch], cross_refs=[])
    assert gap is None


# -----------------------------------------------------------------------------
# Art. 26
# -----------------------------------------------------------------------------


def _video(video_id, author, lang, cluster):
    return AnalyzedVideo(
        metadata=_metadata(video_id=video_id, author=author, language=lang),
        transcript=_transcript(),
        claims=[Claim(text="x", category="other")],
        fact_check_matches=[],
        dsa_tdb_cross_refs=[],
        compliance_gaps=[],
        severity=SeverityScore(score=50, label="high",
                               components={"reach": 0.5, "recency": 0.5, "signal": 0.5}),
        cluster_id=cluster,
        analyzed_at=datetime.now(tz=timezone.utc),
    )


def test_art26_fires_on_three_accounts_same_cluster():
    target = _video("a", "@u1", "ro", "ro_election_2024")
    all_vids = [
        target,
        _video("b", "@u2", "ro", "ro_election_2024"),
        _video("c", "@u3", "ro", "ro_election_2024"),
    ]
    gap = art26_coord.detect(target, all_vids)
    assert gap is not None
    assert gap.severity == "medium"


def test_art26_elevates_severity_cross_language():
    target = _video("a", "@u1", "ro", "doppelganger_2024")
    all_vids = [
        target,
        _video("b", "@u2", "de", "doppelganger_2024"),
        _video("c", "@u3", "pl", "doppelganger_2024"),
    ]
    gap = art26_coord.detect(target, all_vids)
    assert gap is not None
    assert gap.severity == "high"
    assert gap.evidence["cross_language"] is True
    assert len(gap.evidence["distinct_languages"]) >= 2


def test_art26_does_not_fire_below_threshold():
    target = _video("a", "@u1", "ro", "ro_election_2024")
    gap = art26_coord.detect(target, [target])
    assert gap is None
