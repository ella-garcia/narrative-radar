"""Severity scorer per the PDF spec:
  - 45% log-scaled reach
  - 35% exponential recency decay (14-day half-life by default)
  - 20% claim + EDMO match signal
  → 0..100, labelled low/medium/high/critical
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Literal

from ..config import SETTINGS
from ..models import DerivativeSpread, SeverityScore


def _reach_component(view_count: int) -> float:
    """log-scaled. 1k → ~0, 100k → ~0.5, 10M → ~1.0."""
    if view_count <= 1:
        return 0.0
    # log10(view_count) anchored: 3 → 0, 7 → 1
    raw = (math.log10(view_count) - 3.0) / 4.0
    return max(0.0, min(1.0, raw))


def _recency_component(upload_date: datetime, halflife_days: float) -> float:
    if upload_date.tzinfo is None:
        upload_date = upload_date.replace(tzinfo=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    age_days = max(0.0, (now - upload_date).total_seconds() / 86400.0)
    # Exponential decay from 1.0 at age 0; half at halflife_days.
    return math.pow(0.5, age_days / halflife_days)


def _signal_component(claim_count: int, match_count: int) -> float:
    if claim_count <= 0 and match_count <= 0:
        return 0.0
    # 0..1, with diminishing returns
    raw = 0.5 * (1 - math.exp(-claim_count / 3.0)) + 0.5 * (1 - math.exp(-match_count / 2.0))
    return max(0.0, min(1.0, raw))


def _label(score: float) -> Literal["low", "medium", "high", "critical"]:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def score(
    *,
    view_count: int,
    upload_date: datetime,
    claim_count: int,
    match_count: int,
    derivative_spread: DerivativeSpread | None = None,
    is_explicit_root_source: bool = False,
) -> SeverityScore:
    s = SETTINGS
    reach = _reach_component(view_count)
    rec = _recency_component(upload_date, s.severity_recency_halflife_days)
    sig = _signal_component(claim_count, match_count)
    raw = (
        s.severity_w_reach * reach
        + s.severity_w_recency * rec
        + s.severity_w_signal * sig
    )
    pct = round(raw * 100.0, 2)
    final = pct
    root_multiplier_applied = False
    critical_floor_applied = False
    lineage_threshold_triggered = False
    if derivative_spread and derivative_spread.status == "complete":
        if is_explicit_root_source and derivative_spread.root_proof_status == "proven":
            final = round(min(100.0, final * s.severity_root_multiplier), 2)
            root_multiplier_applied = True
        if (
            derivative_spread.derivative_count >= s.severity_lineage_critical_floor_count
            or derivative_spread.aggregate_reach >= s.severity_lineage_critical_floor_reach
        ):
            lineage_threshold_triggered = True
            if final < 75:
                final = 75.0
                critical_floor_applied = True
    return SeverityScore(
        score=final,
        label=_label(final),
        components={
            "reach": round(reach, 4),
            "recency": round(rec, 4),
            "signal": round(sig, 4),
        },
        base_score=pct,
        final_score=final,
        root_multiplier_applied=root_multiplier_applied,
        critical_floor_applied=critical_floor_applied,
        lineage_threshold_triggered=lineage_threshold_triggered,
    )
