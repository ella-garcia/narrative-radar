"""Pydantic models — the wire format between the backend and the frontend.

All output types are deliberately conservative: every gap carries a disclaimer,
no field claims something is "disinformation" or "AI-generated" — we surface
indicators of potential platform obligation failures only.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Pipeline I/O
# -----------------------------------------------------------------------------


class Platform(str, Enum):
    tiktok = "tiktok"
    youtube = "youtube"
    youtube_shorts = "youtube_shorts"
    instagram = "instagram"
    twitter = "twitter"
    other = "other"


class IngestRequest(BaseModel):
    url: str
    constituency: str | None = Field(
        default=None, description="ISO-3166 alpha-2 (e.g. RO, DE, FR)"
    )


class VideoMetadata(BaseModel):
    video_id: str
    url: str
    platform: Platform
    title: str
    author: str
    upload_date: datetime
    view_count: int
    like_count: int | None = None
    duration_sec: float | None = None
    hashtags: list[str] = Field(default_factory=list)
    language: str
    has_platform_ai_label: bool = False  # AI Act Art. 50 indicator
    description: str = ""
    audio_id: str | None = None
    audio_url: str | None = None
    lineage_source_kind: Literal["audio", "unknown"] | None = None
    is_explicit_root_source: bool = False


class Claim(BaseModel):
    text: str
    category: Literal[
        "election",
        "government",
        "military",
        "health",
        "eu_institutions",
        "migration",
        "climate",
        "other",
    ]
    speaker: str | None = None
    start_sec: float | None = None
    end_sec: float | None = None


class Transcript(BaseModel):
    language: str
    segments: list[dict]  # {start, end, speaker, text}
    full_text: str
    confidence: Literal["high", "medium", "low"]
    low_confidence_warning: str | None = None


class OCRTextBlock(BaseModel):
    text: str
    confidence: float | None = None
    frame_sec: float | None = None
    source: Literal["demo", "easyocr", "fallback"] = "fallback"


class OCRResult(BaseModel):
    status: Literal["complete", "failed", "skipped"]
    provider: str
    blocks: list[OCRTextBlock] = Field(default_factory=list)
    error: str | None = None


class ProviderStatus(BaseModel):
    provider: str
    status: Literal["not_configured", "skipped", "success", "failed"]
    request_id: str | None = None
    error: str | None = None
    latency_ms: float | None = None
    raw_ref: str | None = None


class DerivativeVideoSummary(BaseModel):
    video_id: str
    url: str
    author: str
    title: str | None = None
    language: str | None = None
    view_count: int = 0
    upload_date: datetime | None = None
    is_source: bool = False


class DerivativeSpread(BaseModel):
    status: Literal["not_applicable", "pending", "complete", "failed"] = "not_applicable"
    provider: str = "none"
    audio_id: str | None = None
    derivative_count: int = 0
    aggregate_reach: int = 0
    sample_videos: list[DerivativeVideoSummary] = Field(default_factory=list)
    root_proof_status: Literal["proven", "not_proven", "not_applicable"] = "not_applicable"
    error: str | None = None


class FactCheckMatch(BaseModel):
    factcheck_id: str
    title: str
    summary: str
    source: str
    source_url: str
    publication_date: str
    languages_documented: list[str]
    similarity: float


class DSATDBCrossReference(BaseModel):
    """Evidence pulled from the EU DSA Transparency Database showing the
    platform has acted on similar content elsewhere — strengthens an Art. 34-35
    indicator because it is the platform's own admission."""

    platform: str
    similar_actions_count: int
    sample_decision_ground: str  # e.g. "ILLEGAL_OR_HARMFUL_SPEECH"
    sample_action: str  # e.g. "REMOVE_VIDEO"
    note: str


class ComplianceGap(BaseModel):
    article_ref: str  # e.g. "DSA Art. 34-35"
    article_short: str  # e.g. "Systemic Risk"
    severity: Literal["informational", "low", "medium", "high"]
    description: str
    evidence: dict
    disclaimer: str = (
        "Indicator for investigation only. This does not constitute a legal "
        "determination of non-compliance under EU law. Human review and legal "
        "assessment are required before any action is taken."
    )


class SeverityScore(BaseModel):
    score: float  # 0..100
    label: Literal["low", "medium", "high", "critical"]
    components: dict  # {reach, recency, signal}
    base_score: float | None = None
    final_score: float | None = None
    root_multiplier_applied: bool = False
    critical_floor_applied: bool = False
    lineage_threshold_triggered: bool = False


class HumanReview(BaseModel):
    status: Literal["pending", "approved", "additional_review"] = "pending"
    approved_by: str | None = None
    approved_at: datetime | None = None


class AnalyzedVideo(BaseModel):
    metadata: VideoMetadata
    transcript: Transcript
    claims: list[Claim]
    fact_check_matches: list[FactCheckMatch]
    dsa_tdb_cross_refs: list[DSATDBCrossReference]
    compliance_gaps: list[ComplianceGap]
    severity: SeverityScore
    synthetic_media_likelihood: float | None = None  # metadata only, not a gap basis
    derivative_spread: DerivativeSpread = Field(default_factory=DerivativeSpread)
    ocr_result: OCRResult = Field(
        default_factory=lambda: OCRResult(status="skipped", provider="none")
    )
    provider_statuses: dict[str, ProviderStatus] = Field(default_factory=dict)
    human_review: HumanReview = Field(default_factory=HumanReview)
    cluster_id: str | None = None
    analyzed_at: datetime
    constituency: str | None = None


# -----------------------------------------------------------------------------
# Aggregates for dashboard endpoints
# -----------------------------------------------------------------------------


class NarrativeCluster(BaseModel):
    cluster_id: str
    label: str
    languages: list[str]
    video_ids: list[str]
    total_reach: int
    max_severity: float
    article_refs: list[str]


class DashboardSummary(BaseModel):
    total_videos: int
    by_severity: dict[str, int]
    gap_counts_by_article: dict[str, int]
    top_threats: list[AnalyzedVideo]
    clusters: list[NarrativeCluster]


class AmplificationEdge(BaseModel):
    source_handle: str
    related_handle: str
    relation_type: str
    shared_evidence: dict


class ForensicSignal(BaseModel):
    signal_type: str
    severity: Literal["informational", "low", "medium", "high"]
    title: str
    description: str
    evidence: dict
    caveat: str = (
        "Investigative signal only. Does not identify a bot, coordinated actor, "
        "or legal violation without human review."
    )


class ForensicAccountSummary(BaseModel):
    handle: str
    platforms: list[str]
    video_count: int
    languages: list[str]
    first_observed_upload: datetime | None = None
    last_observed_upload: datetime | None = None
    total_reach: int
    known_clusters: list[str]


class ForensicProfile(BaseModel):
    summary: ForensicAccountSummary
    posting_cadence: dict[str, int]
    hashtag_counts: dict[str, int]
    narrative_clusters: dict[str, int]
    engagement_stats: dict
    amplification_edges: list[AmplificationEdge]
    signals: list[ForensicSignal]
    missing_data_notes: list[str]


class NarrativeTrendPoint(BaseModel):
    date_bucket: str
    cluster_id: str | None = None
    language: str | None = None
    hashtag: str | None = None
    video_count: int
    total_reach: int
    handles: list[str]


class BriefingRequest(BaseModel):
    video_ids: list[str]
    constituency: str | None = None
    requester_name: str | None = None


class Briefing(BaseModel):
    title: str
    requester: str
    constituency: str | None
    issued_at: datetime
    executive_summary: str
    findings: list[str]
    cited_articles: list[dict]  # {ref, text}
    evidence: list[dict]
    disclaimer: str
    briefing_hash: str | None = None  # SHA-256 of canonical content for provenance


class AgencyContributorRequest(BaseModel):
    agency_name: str
    contact_label: str | None = None


class AgencyContributor(BaseModel):
    agency_id: str
    agency_name: str
    contact_label: str | None = None
    status: Literal["invited", "active", "submitted"] = "invited"
    invited_at: datetime
    invited_by: str


class AgencyInputRequest(BaseModel):
    agency_id: str
    author: str
    summary: str
    case_details: str
    evidence_links: list[str] = Field(default_factory=list)
    evidence_notes: str = ""


class AgencyInput(BaseModel):
    input_id: str
    agency_id: str
    agency_name: str
    author: str
    summary: str
    case_details: str
    evidence_links: list[str] = Field(default_factory=list)
    evidence_notes: str = ""
    created_at: datetime
    updated_at: datetime


class SharedBriefingUpdate(BaseModel):
    briefing: Briefing


class SharedBriefing(BaseModel):
    briefing_id: str
    briefing: Briefing
    source_video_ids: list[str]
    owner_actor: str
    constituency: str | None = None
    status: Literal["draft", "shared", "closed"] = "shared"
    contributors: list[AgencyContributor] = Field(default_factory=list)
    agency_inputs: list[AgencyInput] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
