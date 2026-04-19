import type {
  AnalyzedVideo,
  AgencyInput,
  AuditResponse,
  Briefing,
  DashboardSummary,
  DemoVideo,
  ForensicAccountSummary,
  ForensicProfile,
  LegalRefs,
  NarrativeTrendPoint,
  SharedBriefing,
} from "./types";

const BASE = "/api";

// -----------------------------------------------------------------------------
// Identity (hackathon-grade — production replaces with real SSO).
// `actor` and `role` are sent on every state-changing request so the audit log
// can attribute. Persisted in localStorage so the demo remembers between
// reloads.
// -----------------------------------------------------------------------------
const LS_KEY = "narrative_radar_identity";

export type Identity = { actor: string; role: string };

const DEFAULT_IDENTITY: Identity = { actor: "demo@parl.example", role: "aide" };

export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_IDENTITY;
    const parsed = JSON.parse(raw);
    return {
      actor: typeof parsed.actor === "string" ? parsed.actor : DEFAULT_IDENTITY.actor,
      role: typeof parsed.role === "string" ? parsed.role : DEFAULT_IDENTITY.role,
    };
  } catch {
    return DEFAULT_IDENTITY;
  }
}

export function setIdentity(id: Identity): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(id));
  } catch { /* non-fatal */ }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const id = getIdentity();
  return {
    "X-Actor": id.actor,
    "X-Role": id.role,
    ...extra,
  };
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const msg = await r.text().catch(() => r.statusText);
    throw new Error(`${r.status} ${r.statusText}: ${msg}`);
  }
  return (await r.json()) as T;
}

export const api = {
  health: () => fetch(`${BASE}/health`).then((r) => j<{ status: string }>(r)),

  legalRefs: () => fetch(`${BASE}/legal-refs`).then((r) => j<LegalRefs>(r)),

  demoVideos: () => fetch(`${BASE}/demo-videos`).then((r) => j<DemoVideo[]>(r)),

  ingest: (url: string, constituency?: string) =>
    fetch(`${BASE}/ingest`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ url, constituency }),
    }).then((r) => j<AnalyzedVideo>(r)),

  listVideos: (params?: {
    severity?: string;
    language?: string;
    article_ref?: string;
    constituency?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.severity) q.set("severity", params.severity);
    if (params?.language) q.set("language", params.language);
    if (params?.article_ref) q.set("article_ref", params.article_ref);
    if (params?.constituency) q.set("constituency", params.constituency);
    const s = q.toString();
    return fetch(`${BASE}/videos${s ? `?${s}` : ""}`).then((r) =>
      j<AnalyzedVideo[]>(r),
    );
  },

  getVideo: (id: string) =>
    fetch(`${BASE}/videos/${id}`).then((r) => j<AnalyzedVideo>(r)),

  approveVideo: (id: string) =>
    fetch(`${BASE}/videos/${id}/approve`, {
      method: "POST",
      headers: authHeaders(),
    }).then((r) => j<AnalyzedVideo>(r)),

  sendForAdditionalReview: (id: string) =>
    fetch(`${BASE}/videos/${id}/additional-review`, {
      method: "POST",
      headers: authHeaders(),
    }).then((r) => j<AnalyzedVideo>(r)),

  dashboard: () =>
    fetch(`${BASE}/dashboard`).then((r) => j<DashboardSummary>(r)),

  forensicAccounts: () =>
    fetch(`${BASE}/forensics/accounts`).then((r) => j<ForensicAccountSummary[]>(r)),

  forensicProfile: (handle: string) =>
    fetch(`${BASE}/forensics/accounts/${encodeURIComponent(handle)}`).then((r) =>
      j<ForensicProfile>(r),
    ),

  forensicTrends: () =>
    fetch(`${BASE}/forensics/trends`).then((r) => j<NarrativeTrendPoint[]>(r)),

  briefing: (opts: {
    video_ids?: string[];
    constituency?: string;
    requester_name?: string;
  }) =>
    fetch(`${BASE}/briefing`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        video_ids: opts.video_ids ?? [],
        constituency: opts.constituency,
        requester_name: opts.requester_name,
      }),
    }).then((r) => j<Briefing>(r)),

  createSharedBriefing: (opts: {
    video_ids?: string[];
    constituency?: string;
    requester_name?: string;
  }) =>
    fetch(`${BASE}/briefing/shared`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        video_ids: opts.video_ids ?? [],
        constituency: opts.constituency,
        requester_name: opts.requester_name,
      }),
    }).then((r) => j<SharedBriefing>(r)),

  getSharedBriefing: (id: string) =>
    fetch(`${BASE}/briefing/shared/${id}`).then((r) => j<SharedBriefing>(r)),

  addSharedBriefingContributor: (
    id: string,
    opts: { agency_name: string; contact_label?: string },
  ) =>
    fetch(`${BASE}/briefing/shared/${id}/contributors`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(opts),
    }).then((r) => j<SharedBriefing>(r)),

  addSharedBriefingAgencyInput: (
    id: string,
    input: Pick<
      AgencyInput,
      "agency_id" | "author" | "summary" | "case_details" | "evidence_links" | "evidence_notes"
    >,
  ) =>
    fetch(`${BASE}/briefing/shared/${id}/agency-inputs`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json", "X-Role": "agency" }),
      body: JSON.stringify(input),
    }).then((r) => j<SharedBriefing>(r)),

  updateSharedBriefing: (id: string, briefing: Briefing) =>
    fetch(`${BASE}/briefing/shared/${id}`, {
      method: "PATCH",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ briefing }),
    }).then((r) => j<SharedBriefing>(r)),

  clear: () =>
    fetch(`${BASE}/storage`, {
      method: "DELETE",
      headers: authHeaders(),
    }),

  audit: (params?: { action?: string; actor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set("action", params.action);
    if (params?.actor) q.set("actor", params.actor);
    if (params?.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    // The audit endpoint requires X-Role: dpo. Send dpo regardless of the
    // currently-active identity — a real deployment would require explicit
    // role-elevation through the institution's SSO.
    return fetch(`${BASE}/audit${s ? `?${s}` : ""}`, {
      headers: authHeaders({ "X-Role": "dpo" }),
    }).then((r) => j<AuditResponse>(r));
  },
};
