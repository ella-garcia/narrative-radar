"""FastAPI app — narrow surface area, four endpoints."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import audit, storage
from .briefing.claude_brief import generate as generate_briefing
from .compliance.art26_coord import cluster_summary
from .ingest.yt_dlp_wrapper import all_demo_videos
from .models import (
    AnalyzedVideo,
    Briefing,
    BriefingRequest,
    DashboardSummary,
    IngestRequest,
    NarrativeCluster,
)
from .pipeline import analyze_url

app = FastAPI(
    title="Narrative Radar",
    description="AI-powered DSA & AI Act compliance-gap monitoring for parliamentary offices.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened by deploy config
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LEGAL_REFS = json.loads((Path(__file__).resolve().parent / "legal_refs.json").read_text())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/legal-refs")
def get_legal_refs() -> dict[str, Any]:
    return LEGAL_REFS


@app.get("/demo-videos")
def get_demo_videos() -> list[dict[str, Any]]:
    """Pre-canned demo URLs the front-end exposes as one-click ingestion targets."""
    return [
        {
            "video_id": d["video_id"],
            "url": d["url"],
            "platform": d["platform"],
            "title": d["title"],
            "language": d["language"],
            "narrative_hint": d.get("narrative_hint"),
        }
        for d in all_demo_videos()
    ]


@app.post("/ingest", response_model=AnalyzedVideo)
def ingest(
    req: IngestRequest,
    x_actor: str | None = Header(default=None),
    x_role: str | None = Header(default=None),
) -> AnalyzedVideo:
    try:
        v = analyze_url(req.url, req.constituency)
    except RuntimeError as e:
        audit.log(
            actor=x_actor or "anonymous",
            role=x_role or "aide",
            action="ingest_failed",
            detail={"url": req.url, "error": str(e)},
        )
        raise HTTPException(status_code=400, detail=str(e))
    audit.log(
        actor=x_actor or "anonymous",
        role=x_role or "aide",
        action="ingest",
        detail={
            "url": req.url,
            "video_id": v.metadata.video_id,
            "platform": v.metadata.platform.value,
            "language": v.metadata.language,
            "constituency": req.constituency,
            "severity_score": v.severity.score,
            "severity_label": v.severity.label,
            "gap_refs": [g.article_ref for g in v.compliance_gaps],
            "cluster_id": v.cluster_id,
        },
    )
    return v


@app.get("/videos", response_model=list[AnalyzedVideo])
def list_videos(
    severity: str | None = None,
    language: str | None = None,
    article_ref: str | None = None,
    constituency: str | None = None,
) -> list[AnalyzedVideo]:
    out = storage.all_videos()
    if severity:
        out = [v for v in out if v.severity.label == severity]
    if language:
        out = [v for v in out if v.metadata.language == language]
    if article_ref:
        out = [
            v for v in out if any(g.article_ref == article_ref for g in v.compliance_gaps)
        ]
    if constituency:
        out = [v for v in out if (v.constituency or "").upper() == constituency.upper()]
    out.sort(key=lambda v: v.severity.score, reverse=True)
    return out


@app.get("/videos/{video_id}", response_model=AnalyzedVideo)
def get_video(video_id: str) -> AnalyzedVideo:
    v = storage.get(video_id)
    if not v:
        raise HTTPException(status_code=404, detail=f"video_id={video_id} not found")
    return v


@app.get("/dashboard", response_model=DashboardSummary)
def dashboard() -> DashboardSummary:
    videos = storage.all_videos()
    by_sev = Counter(v.severity.label for v in videos)
    gap_counter: Counter[str] = Counter()
    for v in videos:
        for g in v.compliance_gaps:
            gap_counter[g.article_ref] += 1
    top = sorted(videos, key=lambda v: v.severity.score, reverse=True)[:3]
    clusters = [NarrativeCluster(label=c["cluster_id"].replace("_", " ").title(), **c)
                for c in cluster_summary(videos)]
    return DashboardSummary(
        total_videos=len(videos),
        by_severity=dict(by_sev),
        gap_counts_by_article=dict(gap_counter),
        top_threats=top,
        clusters=clusters,
    )


@app.post("/briefing", response_model=Briefing)
def briefing(
    req: BriefingRequest,
    x_actor: str | None = Header(default=None),
    x_role: str | None = Header(default=None),
) -> Briefing:
    if req.video_ids:
        videos = [v for v_id in req.video_ids if (v := storage.get(v_id))]
    else:
        videos = sorted(
            storage.all_videos(), key=lambda v: v.severity.score, reverse=True
        )[:5]
    b = generate_briefing(
        videos, requester=req.requester_name, constituency=req.constituency
    )
    audit.log(
        actor=x_actor or req.requester_name or "anonymous",
        role=x_role or "aide",
        action="briefing_generated",
        detail={
            "constituency": req.constituency,
            "video_ids": [v.metadata.video_id for v in videos],
            "n_findings": len(b.findings),
            "cited_articles": [a.get("ref") for a in b.cited_articles],
            "briefing_hash": b.briefing_hash,
        },
    )
    return b


@app.delete("/storage")
def clear_storage(
    x_actor: str | None = Header(default=None),
    x_role: str | None = Header(default=None),
) -> dict[str, str]:
    n = len(storage.all_videos())
    storage.clear()
    audit.log(
        actor=x_actor or "anonymous",
        role=x_role or "aide",
        action="storage_cleared",
        detail={"records_removed": n},
    )
    return {"status": "cleared"}


# -----------------------------------------------------------------------------
# Audit log — DPO-only read
# -----------------------------------------------------------------------------


def _require_dpo(x_role: str | None) -> None:
    """Hackathon-grade gate. Production must replace with the institution's
    real SSO + RBAC. The role check is documented in GOVERNANCE.md."""
    if (x_role or "").lower() != "dpo":
        raise HTTPException(
            status_code=403,
            detail=(
                "Audit log read requires X-Role: dpo. This is a hackathon-grade "
                "gate; production must use institutional SSO + RBAC."
            ),
        )


@app.get("/audit")
def get_audit_log(
    x_role: str | None = Header(default=None),
    action: str | None = None,
    actor: str | None = None,
    limit: int = 200,
) -> dict[str, object]:
    _require_dpo(x_role)
    records = audit.read_all()
    if action:
        records = [r for r in records if r.get("action") == action]
    if actor:
        records = [r for r in records if r.get("actor") == actor]
    chain = audit.verify_chain()
    return {
        "chain": chain,
        "count_returned": min(len(records), limit),
        "count_total": len(records),
        "records": records[-limit:][::-1],  # newest first
    }
