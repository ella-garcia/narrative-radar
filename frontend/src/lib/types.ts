export type Severity = "low" | "medium" | "high" | "critical";
export type GapSeverity = "informational" | "low" | "medium" | "high";

export interface Claim {
  text: string;
  category: string;
  speaker?: string | null;
  start_sec?: number | null;
  end_sec?: number | null;
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

export interface DemoVideo {
  video_id: string;
  url: string;
  platform: string;
  title: string;
  language: string;
  narrative_hint?: string | null;
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
