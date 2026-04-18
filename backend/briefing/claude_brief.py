"""Parliamentary briefing generator. Uses Anthropic Claude when an API key is
present; otherwise produces a deterministic structured-template briefing
suitable for a demo or unit test."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from ..config import SETTINGS
from ..models import AnalyzedVideo, Briefing

LEGAL_REFS = json.loads((Path(__file__).resolve().parent.parent / "legal_refs.json").read_text())

DISCLAIMER = (
    "All findings in this briefing are indicators for investigation only. "
    "They do not constitute a legal determination of non-compliance under EU "
    "law. Human review and qualified legal assessment are required before any "
    "action is taken."
)


def _build_findings(videos: list[AnalyzedVideo]) -> list[str]:
    findings: list[str] = []
    for v in videos:
        if not v.compliance_gaps:
            continue
        gaps = ", ".join(g.article_ref for g in v.compliance_gaps)
        findings.append(
            f"{v.metadata.platform.value.upper()} video by {v.metadata.author} "
            f"(reach: {v.metadata.view_count:,}; uploaded "
            f"{v.metadata.upload_date.date()}) shows indicators under {gaps}. "
            f"Severity score: {v.severity.score:.0f}/100 ({v.severity.label})."
            + (
                f" Derivative spread radius: {v.derivative_spread.derivative_count} "
                f"video(s), aggregate reach {v.derivative_spread.aggregate_reach:,}."
                if v.derivative_spread.status == "complete"
                else ""
            )
        )
    if not findings:
        findings.append(
            "No high-severity items in the requested set. Continued monitoring recommended."
        )
    return findings


def _build_evidence(videos: list[AnalyzedVideo]) -> list[dict]:
    out = []
    for v in videos:
        out.append(
            {
                "video_id": v.metadata.video_id,
                "url": v.metadata.url,
                "platform": v.metadata.platform.value,
                "title": v.metadata.title,
                "author": v.metadata.author,
                "language": v.metadata.language,
                "reach": v.metadata.view_count,
                "transcript_excerpt": v.transcript.full_text[:600]
                + ("..." if len(v.transcript.full_text) > 600 else ""),
                "claims": [c.text for c in v.claims],
                "edmo_matches": [
                    {
                        "title": m.title,
                        "source": m.source,
                        "source_url": m.source_url,
                        "similarity": m.similarity,
                    }
                    for m in v.fact_check_matches
                ],
                "dsa_tdb_cross_refs": [
                    {
                        "platform": c.platform,
                        "decision_ground": c.sample_decision_ground,
                        "actions_taken": c.similar_actions_count,
                    }
                    for c in v.dsa_tdb_cross_refs
                ],
                "gaps": [
                    {
                        "article_ref": g.article_ref,
                        "severity": g.severity,
                        "description": g.description,
                    }
                    for g in v.compliance_gaps
                ],
                "derivative_spread_radius": (
                    {
                        "audio_id": v.derivative_spread.audio_id,
                        "derivative_count": v.derivative_spread.derivative_count,
                        "aggregate_reach": v.derivative_spread.aggregate_reach,
                        "root_proof_status": v.derivative_spread.root_proof_status,
                        "provider": v.derivative_spread.provider,
                    }
                    if v.derivative_spread.status == "complete"
                    else None
                ),
            }
        )
    return out


def _cited_articles(videos: list[AnalyzedVideo]) -> list[dict]:
    refs = sorted({g.article_ref for v in videos for g in v.compliance_gaps})
    return [{"ref": r, **LEGAL_REFS.get(r, {})} for r in refs]


def _executive_summary_template(videos: list[AnalyzedVideo], constituency: str | None) -> str:
    if not videos:
        return "No items selected for briefing."
    n = len(videos)
    crits = sum(1 for v in videos if v.severity.label in {"high", "critical"})
    refs = sorted({g.article_ref for v in videos for g in v.compliance_gaps})
    where = f" relevant to {constituency.upper()}" if constituency else ""
    refs_clause = (
        f" with indicators under {', '.join(refs)}" if refs else ""
    )
    spread = sum(v.derivative_spread.derivative_count for v in videos if v.derivative_spread.status == "complete")
    spread_reach = sum(v.derivative_spread.aggregate_reach for v in videos if v.derivative_spread.status == "complete")
    return (
        f"This briefing covers {n} short-form video item(s){where}, of which "
        f"{crits} carry high or critical severity{refs_clause}. The findings "
        "are grounded in EDMO / EUvsDisinfo fact-checks and, where applicable, "
        "the platforms' own DSA Transparency Database submissions. Narrative "
        "Radar does not classify content as disinformation; it identifies "
        "potential platform obligation failures under EU law."
        + (
            f" Derivative spread evidence covers {spread} subsequent video(s) "
            f"with aggregate reach {spread_reach:,}."
            if spread
            else ""
        )
    )


def generate(
    videos: list[AnalyzedVideo],
    requester: str | None = None,
    constituency: str | None = None,
) -> Briefing:
    requester = requester or "Parliamentary Aide"
    title = (
        "Narrative Radar Parliamentary Briefing — "
        f"{datetime.now(tz=timezone.utc).date().isoformat()}"
    )
    findings = _build_findings(videos)
    evidence = _build_evidence(videos)
    cited = _cited_articles(videos)

    summary: str
    if SETTINGS.anthropic_api_key:
        try:
            summary = _summary_via_claude(videos, constituency)
        except Exception:
            summary = _executive_summary_template(videos, constituency)
    else:
        summary = _executive_summary_template(videos, constituency)

    issued_at = datetime.now(tz=timezone.utc)
    canonical = json.dumps(
        {
            "title": title,
            "requester": requester,
            "constituency": constituency,
            "issued_at": issued_at.isoformat(),
            "executive_summary": summary,
            "findings": findings,
            "cited_articles": cited,
            "evidence": evidence,
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    briefing_hash = "sha256:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]

    return Briefing(
        title=title,
        requester=requester,
        constituency=constituency,
        issued_at=issued_at,
        executive_summary=summary,
        findings=findings,
        cited_articles=cited,
        evidence=evidence,
        disclaimer=DISCLAIMER,
        briefing_hash=briefing_hash,
    )


def _summary_via_claude(
    videos: list[AnalyzedVideo], constituency: str | None
) -> str:
    from ..providers.anthropic_provider import summarize_briefing

    return summarize_briefing(videos, constituency)
