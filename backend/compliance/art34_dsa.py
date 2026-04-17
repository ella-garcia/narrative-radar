"""DSA Art. 34-35 — systemic risk indicator with DSA Transparency Database
cross-reference.

This is the wow signal. The indicator only fires when:
  (a) the claim semantically matches an EDMO / EUvsDisinfo-documented narrative,
  (b) the platform's own DSA Transparency Database filings show it has
      moderated similar content elsewhere (its own admission of risk),
  (c) the video is still live (we have its current view count via yt-dlp).

(c) is treated as true for any input we have just ingested.
"""

from __future__ import annotations

import json
from pathlib import Path

from ..models import (
    ComplianceGap,
    DSATDBCrossReference,
    FactCheckMatch,
    VideoMetadata,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_tdb() -> dict:
    with (DATA_DIR / "dsa_tdb_seed.json").open() as f:
        return json.load(f)


_TDB = _load_tdb()


def cross_reference(
    metadata: VideoMetadata, narrative_cluster: str | None
) -> list[DSATDBCrossReference]:
    if not narrative_cluster:
        return []
    grounds = _TDB.get("narrative_to_decision_ground", {}).get(narrative_cluster, [])
    if not grounds:
        return []
    platform_data = _TDB.get("platforms", {}).get(metadata.platform.value, {})
    if not platform_data:
        return []
    pds = platform_data.get("decision_grounds", {})

    refs: list[DSATDBCrossReference] = []
    for g in grounds:
        d = pds.get(g)
        if not d:
            continue
        refs.append(
            DSATDBCrossReference(
                platform=metadata.platform.value,
                similar_actions_count=int(d["actions_taken"]),
                sample_decision_ground=g,
                sample_action=d.get("sample_action", "UNSPECIFIED"),
                note=d.get(
                    "note",
                    "Aggregate count of platform actions on similar content per the EU DSA Transparency Database.",
                ),
            )
        )
    return refs


def detect(
    metadata: VideoMetadata,
    matches: list[FactCheckMatch],
    cross_refs: list[DSATDBCrossReference],
) -> ComplianceGap | None:
    if not matches:
        return None
    if not cross_refs:
        return None

    top = matches[0]
    actions_total = sum(c.similar_actions_count for c in cross_refs)
    severity = "high" if actions_total >= 50_000 else "medium"

    return ComplianceGap(
        article_ref="DSA Art. 34-35",
        article_short="Systemic risk — likely inadequate mitigation",
        severity=severity,
        description=(
            f"Content semantically matches a fact-check published by "
            f"{top.source} (similarity {top.similarity:.2f}). The platform's "
            f"own DSA Transparency Database filings show it has acted "
            f"{actions_total:,} time(s) on similar content elsewhere. The "
            "persistence of this specific item may indicate inadequate "
            "mitigation of the systemic risk under Art. 35."
        ),
        evidence={
            "matched_factcheck_id": top.factcheck_id,
            "matched_factcheck_url": top.source_url,
            "similarity": top.similarity,
            "platform": metadata.platform.value,
            "view_count": metadata.view_count,
            "dsa_tdb_actions_taken": actions_total,
            "dsa_tdb_decision_grounds": [c.sample_decision_ground for c in cross_refs],
            "scope_note": (
                "Backed by the platform's own DSA Transparency Database "
                "submissions, not by Narrative Radar's opinion."
            ),
        },
    )
