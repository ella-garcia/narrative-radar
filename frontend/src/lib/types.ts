export type Severity = "low" | "medium" | "high" | "critical";
export type GapSeverity = "informational" | "low" | "medium" | "high";

export interface Claim {
  text: string;
  category: string;
  speaker?: string | null;
  start_sec?: number | null;
  end_sec?: number | null;
}

export interface OCRTextBlock {
  text: string;
  confidence?: number | null;
  frame_sec?: number | null;
  source: "demo" | "easyocr" | "fallback";
}

export interface OCRResult {
  status: "complete" | "failed" | "skipped";
  provider: string;
  blocks: OCRTextBlock[];
  error?: string | null;
}

export interface ProviderStatus {
  provider: string;
  status: "not_configured" | "skipped" | "success" | "failed";
  request_id?: string | null;
  error?: string | null;
  latency_ms?: number | null;
  raw_ref?: string | null;
}

export interface Transcript {
  language: string;
  segments: {
    start: number;
    end: number;
    speaker: string;
    text: string;
  }[];
  full_text: string;
  confidence: "high" | "medium" | "low";
  low_confidence_warning?: string | null;
}

export interface FactCheckMatch {
  factcheck_id: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  publication_date: string;
  languages_documented: string[];
  similarity: number;
}

export interface DSATDBCrossReference {
  platform: string;
  similar_actions_count: number;
  sample_decision_ground: string;
  sample_action: string;
  note: string;
}

export interface ComplianceGap {
  article_ref: string;
  article_short: string;
  severity: GapSeverity;
  description: string;
  evidence: Record<string, unknown>;
  disclaimer: string;
}

export interface SeverityScore {
  score: number;
  label: Severity;
  components: { reach: number; recency: number; signal: number };
  base_score?: number | null;
  final_score?: number | null;
  root_multiplier_applied: boolean;
  critical_floor_applied: boolean;
  lineage_threshold_triggered: boolean;
}

export interface HumanReview {
  status: "pending" | "approved" | "additional_review";
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface VideoMetadata {
  video_id: string;
  url: string;
  platform: string;
  title: string;
  author: string;
  upload_date: string;
  view_count: number;
  like_count?: number | null;
  duration_sec?: number | null;
  hashtags: string[];
  language: string;
  has_platform_ai_label: boolean;
  description: string;
  audio_id?: string | null;
  audio_url?: string | null;
  lineage_source_kind?: "audio" | "unknown" | null;
  is_explicit_root_source: boolean;
}

export interface DerivativeVideoSummary {
  video_id: string;
  url: string;
  author: string;
  title?: string | null;
  language?: string | null;
  view_count: number;
  upload_date?: string | null;
  is_source: boolean;
}

export interface DerivativeSpread {
  status: "not_applicable" | "pending" | "complete" | "failed";
  provider: string;
  audio_id?: string | null;
  derivative_count: number;
  aggregate_reach: number;
  sample_videos: DerivativeVideoSummary[];
  root_proof_status: "proven" | "not_proven" | "not_applicable";
  error?: string | null;
}

export interface AnalyzedVideo {
  metadata: VideoMetadata;
  transcript: Transcript;
  claims: Claim[];
  fact_check_matches: FactCheckMatch[];
  dsa_tdb_cross_refs: DSATDBCrossReference[];
  compliance_gaps: ComplianceGap[];
  severity: SeverityScore;
  synthetic_media_likelihood?: number | null;
  derivative_spread: DerivativeSpread;
  ocr_result: OCRResult;
  provider_statuses: Record<string, ProviderStatus>;
  human_review: HumanReview;
  cluster_id?: string | null;
  analyzed_at: string;
  constituency?: string | null;
}

export interface NarrativeCluster {
  cluster_id: string;
  label: string;
  languages: string[];
  video_ids: string[];
  total_reach: number;
  max_severity: number;
  article_refs: string[];
}

export interface DashboardSummary {
  total_videos: number;
  by_severity: Record<string, number>;
  gap_counts_by_article: Record<string, number>;
  top_threats: AnalyzedVideo[];
  clusters: NarrativeCluster[];
}

export interface AmplificationEdge {
  source_handle: string;
  related_handle: string;
  relation_type: string;
  shared_evidence: Record<string, any>;
}

export interface ForensicSignal {
  signal_type: string;
  severity: "informational" | "low" | "medium" | "high";
  title: string;
  description: string;
  evidence: Record<string, any>;
  caveat: string;
}

export interface ForensicAccountSummary {
  handle: string;
  platforms: string[];
  video_count: number;
  languages: string[];
  first_observed_upload?: string | null;
  last_observed_upload?: string | null;
  total_reach: number;
  known_clusters: string[];
}

export interface ForensicProfile {
  summary: ForensicAccountSummary;
  posting_cadence: Record<string, number>;
  hashtag_counts: Record<string, number>;
  narrative_clusters: Record<string, number>;
  engagement_stats: Record<string, any>;
  amplification_edges: AmplificationEdge[];
  signals: ForensicSignal[];
  missing_data_notes: string[];
}

export interface NarrativeTrendPoint {
  date_bucket: string;
  cluster_id?: string | null;
  language?: string | null;
  hashtag?: string | null;
  video_count: number;
  total_reach: number;
  handles: string[];
}

export interface DemoVideo {
  video_id: string;
  url: string;
  platform: string;
  title: string;
  language: string;
  narrative_hint?: string | null;
  view_count: number;
  audio_id?: string | null;
  derivative_count: number;
  derivative_aggregate_reach: number;
  derivative_languages: string[];
}

export interface Briefing {
  title: string;
  requester: string;
  constituency?: string | null;
  issued_at: string;
  executive_summary: string;
  findings: string[];
  cited_articles: {
    ref: string;
    short?: string;
    summary?: string;
    instrument?: string;
    official_url?: string;
    enforcement_date?: string;
    indicator_basis?: string;
  }[];
  evidence: any[];
  disclaimer: string;
  briefing_hash?: string | null;
}

export interface AgencyContributor {
  agency_id: string;
  agency_name: string;
  contact_label?: string | null;
  status: "invited" | "active" | "submitted";
  invited_at: string;
  invited_by: string;
}

export interface AgencyInput {
  input_id: string;
  agency_id: string;
  agency_name: string;
  author: string;
  summary: string;
  case_details: string;
  evidence_links: string[];
  evidence_notes: string;
  created_at: string;
  updated_at: string;
}

export interface SharedBriefing {
  briefing_id: string;
  briefing: Briefing;
  source_video_ids: string[];
  owner_actor: string;
  constituency?: string | null;
  status: "draft" | "shared" | "closed";
  contributors: AgencyContributor[];
  agency_inputs: AgencyInput[];
  created_at: string;
  updated_at: string;
}

export interface LegalRefs {
  [ref: string]: {
    short: string;
    instrument: string;
    summary: string;
    official_url: string;
    indicator_basis: string;
    enforcement_date?: string;
  };
}

export interface AuditRecord {
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  detail: Record<string, any>;
  prev_hash: string;
  entry_hash: string;
}

export interface AuditResponse {
  chain: {
    total_records: number;
    intact: boolean;
    broken_indices: number[];
    head_hash: string;
  };
  count_returned: number;
  count_total: number;
  records: AuditRecord[];
}
