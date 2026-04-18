from datetime import datetime, timedelta, timezone

from backend.models import DerivativeSpread
from backend.scoring.severity import score


def test_low_reach_low_severity():
    s = score(
        view_count=100,
        upload_date=datetime.now(tz=timezone.utc) - timedelta(days=180),
        claim_count=0,
        match_count=0,
    )
    assert s.label == "low"
    assert s.score < 25


def test_high_recent_high_severity():
    s = score(
        view_count=2_000_000,
        upload_date=datetime.now(tz=timezone.utc) - timedelta(hours=12),
        claim_count=4,
        match_count=2,
    )
    assert s.label in {"high", "critical"}
    assert s.score >= 50


def test_recency_decays():
    base = dict(view_count=100_000, claim_count=2, match_count=1)
    fresh = score(
        upload_date=datetime.now(tz=timezone.utc), **base
    )
    old = score(
        upload_date=datetime.now(tz=timezone.utc) - timedelta(days=60), **base
    )
    assert fresh.score > old.score
    assert fresh.components["recency"] > old.components["recency"]


def test_components_sum_to_score():
    s = score(
        view_count=500_000,
        upload_date=datetime.now(tz=timezone.utc) - timedelta(days=2),
        claim_count=3,
        match_count=2,
    )
    expected = (
        0.45 * s.components["reach"]
        + 0.35 * s.components["recency"]
        + 0.20 * s.components["signal"]
    ) * 100
    assert abs((s.base_score or 0) - expected) < 0.5


def test_root_multiplier_and_critical_floor_apply_from_lineage():
    s = score(
        view_count=5_000,
        upload_date=datetime.now(tz=timezone.utc) - timedelta(days=1),
        claim_count=2,
        match_count=1,
        derivative_spread=DerivativeSpread(
            status="complete",
            provider="demo",
            audio_id="sound-1",
            derivative_count=30,
            aggregate_reach=2_100_000,
            root_proof_status="proven",
        ),
        is_explicit_root_source=True,
    )
    assert s.root_multiplier_applied is True
    assert s.lineage_threshold_triggered is True
    assert s.score >= 75
