"""Anthropic briefing adapter."""

from __future__ import annotations

import json

from ..config import SETTINGS, live_provider_calls_allowed
from ..models import AnalyzedVideo
from .base import ProviderNotConfigured


def summarize_briefing(videos: list[AnalyzedVideo], constituency: str | None) -> str:
    if not SETTINGS.anthropic_api_key or not live_provider_calls_allowed():
        raise ProviderNotConfigured("anthropic")
    try:
        from anthropic import Anthropic  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ProviderNotConfigured("anthropic-sdk") from exc

    client = Anthropic(api_key=SETTINGS.anthropic_api_key)
    payload = {
        "constituency": constituency,
        "videos": [
            {
                "platform": v.metadata.platform.value,
                "language": v.metadata.language,
                "reach": v.metadata.view_count,
                "severity": v.severity.label,
                "score": v.severity.score,
                "claims": [c.text for c in v.claims],
                "matched_factchecks": [m.title for m in v.fact_check_matches],
                "gap_refs": [g.article_ref for g in v.compliance_gaps],
                "derivative_spread": v.derivative_spread.model_dump(mode="json"),
            }
            for v in videos
        ],
    }
    msg = client.messages.create(
        model=SETTINGS.anthropic_briefing_model,
        max_tokens=400,
        system=(
            "You write 80-120 word executive summaries for parliamentary aides. "
            "Strictly factual. Cite article references where present. Never "
            "characterise content as disinformation; refer instead to potential "
            "platform obligation failures. End with the line: 'Indicators only; "
            "human review required.'"
        ),
        messages=[{"role": "user", "content": json.dumps(payload)}],
    )
    return "\n".join(b.text for b in msg.content if hasattr(b, "text")).strip()
