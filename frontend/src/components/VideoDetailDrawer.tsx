import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AnalyzedVideo } from "../lib/types";
import { compactNumber, flag, platformLabel, relativeDate } from "../lib/format";
import { SeverityMeter } from "./SeverityMeter";
import { ViolationBadge } from "./ViolationBadge";

const CATEGORY_PALETTE: Record<string, string> = {
  election: "bg-purple-100 text-purple-800",
  government: "bg-blue-100 text-blue-800",
  military: "bg-red-100 text-red-800",
  health: "bg-emerald-100 text-emerald-800",
  eu_institutions: "bg-amber-100 text-amber-800",
  migration: "bg-orange-100 text-orange-800",
  climate: "bg-green-100 text-green-800",
  other: "bg-eu-slate-100 text-eu-slate-700",
};

export function VideoDetailDrawer({
  video,
  onClose,
  onReviewUpdated,
}: {
  video: AnalyzedVideo;
  onClose: () => void;
  onReviewUpdated?: (video: AnalyzedVideo) => void;
}) {
  const [liveVideo, setLiveVideo] = useState(video);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    setLiveVideo(video);
    setIsFullScreen(false);
  }, [video]);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (liveVideo.derivative_spread.status !== "pending") return;
    let cancelled = false;
    const t = window.setInterval(async () => {
      try {
        const fresh = await api.getVideo(liveVideo.metadata.video_id);
        if (!cancelled) setLiveVideo(fresh);
      } catch {
        // Ignore transient polling failures in the drawer.
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [liveVideo.derivative_spread.status, liveVideo.metadata.video_id]);

  const m = liveVideo.metadata;
  const synth = liveVideo.synthetic_media_likelihood;
  const lowConf = liveVideo.transcript.confidence !== "high";
  const approved = liveVideo.human_review.status === "approved";
  const sentForAdditionalReview = liveVideo.human_review.status === "additional_review";
  const crossPlatformReach =
    liveVideo.derivative_spread.status === "complete"
      ? liveVideo.derivative_spread.aggregate_reach
      : 0;
  const combinedReach = m.view_count + crossPlatformReach;

  async function updateReviewStatus(nextStatus: "approved" | "additional_review") {
    setIsReviewing(true);
    try {
      const updated =
        nextStatus === "approved"
          ? await api.approveVideo(m.video_id)
          : await api.sendForAdditionalReview(m.video_id);
      setLiveVideo(updated);
      onReviewUpdated?.(updated);
    } finally {
      setIsReviewing(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close video details"
        className="fixed inset-0 h-screen w-screen cursor-default bg-eu-ink/45"
        onClick={onClose}
      />
      <aside
        aria-modal="true"
        role="dialog"
        className={`relative flex flex-col overflow-hidden bg-eu-slate-50 shadow-2xl ${
          isFullScreen
            ? "h-screen w-screen rounded-none"
            : "max-h-[calc(100vh-2rem)] w-[min(911px,calc(100vw-2rem))] rounded-lg"
        }`}
      >
        <div className="shrink-0 bg-white border-b border-eu-slate-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="chip">{platformLabel(m.platform)}</span>
                <span className="chip">{flag(m.language)} {m.language.toUpperCase()}</span>
                {liveVideo.cluster_id && (
                  <span className="chip bg-eu-blue/5 text-eu-blue">
                    {liveVideo.cluster_id.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <h2 className="font-serif text-xl font-semibold text-eu-ink truncate">
                {m.title}
              </h2>
              <div className="text-sm text-eu-slate-500 mt-0.5">
                {m.author} · {compactNumber(m.view_count)} views · {relativeDate(m.upload_date)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFullScreen((current) => !current)}
                aria-label={isFullScreen ? "Exit full screen preview" : "Expand to full screen"}
                title={isFullScreen ? "Exit full screen" : "Full screen"}
                className="grid h-8 w-8 place-items-center rounded text-eu-slate-500 hover:bg-eu-slate-100 hover:text-eu-ink"
              >
                {isFullScreen ? "↙" : "↗"}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close video details"
                className="grid h-8 w-8 place-items-center rounded text-eu-slate-500 hover:bg-eu-slate-100 hover:text-eu-ink"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="mt-3">
            <SeverityMeter
              score={liveVideo.severity.score}
              label={liveVideo.severity.label}
              details={liveVideo.severity}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`badge border ${
                approved
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : sentForAdditionalReview
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
              }`}
            >
              {approved
                ? "Approved"
                : sentForAdditionalReview
                  ? "Sent for Additional Review"
                  : "Human Review Pending"}
            </span>
            {approved && liveVideo.human_review.approved_by && (
              <span className="text-xs text-eu-slate-500">
                by {liveVideo.human_review.approved_by}
              </span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {lowConf && (
            <div className="mx-6 mt-4 surface-tight bg-amber-50 border-amber-200 px-4 py-3 text-sm text-amber-900">
              ⚠ <strong>Human review required.</strong>{" "}
              {liveVideo.transcript.low_confidence_warning ??
                `ASR + LLM confidence is ${liveVideo.transcript.confidence}.`}
            </div>
          )}

        <Section title="Compliance gap indicators">
          {liveVideo.compliance_gaps.length === 0 ? (
            <p className="text-sm text-eu-slate-500">No gap indicators above threshold for this item.</p>
          ) : (
            <div className="space-y-3">
              {liveVideo.compliance_gaps.map((g) => (
                <div key={g.article_ref} className="surface-tight p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <ViolationBadge articleRef={g.article_ref} severity={g.severity} />
                    <span className="text-xs text-eu-slate-500">
                      {g.article_short}
                    </span>
                  </div>
                  <p className="text-sm text-eu-slate-700">{g.description}</p>
                  <details className="mt-2">
                    <summary className="text-xs text-eu-slate-500 cursor-pointer hover:text-eu-blue">
                      Evidence detail
                    </summary>
                    <pre className="text-[11px] mt-2 bg-eu-slate-50 p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(g.evidence, null, 2)}
                    </pre>
                  </details>
                  <p className="text-[11px] text-eu-slate-400 italic mt-2">
                    {g.disclaimer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Derivative spread radius">
          {liveVideo.derivative_spread.status === "not_applicable" ? (
            <p className="text-sm text-eu-slate-500">No lineage enrichment was scheduled for this item.</p>
          ) : liveVideo.derivative_spread.status === "pending" ? (
            <p className="text-sm text-eu-blue">Lineage enrichment is still running. This drawer refreshes automatically.</p>
          ) : liveVideo.derivative_spread.status === "failed" ? (
            <p className="text-sm text-sev-medium">
              Lineage enrichment failed. {liveVideo.derivative_spread.error ?? "No further detail available."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="surface-tight p-4 text-sm">
                <div className="flex flex-wrap gap-3 text-eu-slate-700">
                  <span><strong>{liveVideo.derivative_spread.derivative_count}</strong> derivative videos</span>
                  <span><strong>{compactNumber(liveVideo.derivative_spread.aggregate_reach)}</strong> aggregate reach</span>
                  <span>root proof: <strong>{liveVideo.derivative_spread.root_proof_status}</strong></span>
                </div>
                {crossPlatformReach > 0 && (
                  <div className="mt-4 grid gap-2 border-t border-eu-slate-100 pt-3 sm:grid-cols-3">
                    <ReachMetric
                      label="Native video reach"
                      value={m.view_count}
                    />
                    <ReachMetric
                      label="Cross-platform spread"
                      value={crossPlatformReach}
                    />
                    <ReachMetric
                      label="Combined reach"
                      value={combinedReach}
                      emphasized
                    />
                  </div>
                )}
                {liveVideo.derivative_spread.audio_id && (
                  <div className="mt-2 text-xs text-eu-slate-500 font-mono">
                    audio_id {liveVideo.derivative_spread.audio_id}
                  </div>
                )}
              </div>
              {liveVideo.derivative_spread.sample_videos.length > 0 && (
                <div className="space-y-2">
                  {liveVideo.derivative_spread.sample_videos.slice(0, 6).map((child) => (
                    <div key={child.video_id} className="surface-tight p-3 text-sm">
                      <div className="font-medium text-eu-ink">{child.title || child.video_id}</div>
                      <div className="text-xs text-eu-slate-500 mt-1">
                        {child.author} {child.language ? `· ${flag(child.language)} ${child.language.toUpperCase()}` : ""} · {compactNumber(child.view_count)} views
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="Extracted claims">
          <div className="space-y-2">
            {liveVideo.claims.map((c, i) => (
              <div key={i} className="surface-tight p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${CATEGORY_PALETTE[c.category] ?? CATEGORY_PALETTE.other}`}>
                    {c.category}
                  </span>
                  {c.start_sec != null && (
                    <span className="text-[11px] text-eu-slate-500 font-mono">
                      {c.start_sec.toFixed(0)}s
                      {c.speaker ? ` · ${c.speaker}` : ""}
                    </span>
                  )}
                </div>
                <p className="text-eu-slate-700">{c.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="OCR text">
          {liveVideo.ocr_result.blocks.length === 0 ? (
            <p className="text-sm text-eu-slate-500">
              OCR status: {liveVideo.ocr_result.status}
              {liveVideo.ocr_result.error ? ` · ${liveVideo.ocr_result.error}` : ""}
            </p>
          ) : (
            <div className="space-y-2">
              {liveVideo.ocr_result.blocks.map((b, i) => (
                <div key={i} className="surface-tight p-3 text-sm">
                  <div className="text-eu-ink">{b.text}</div>
                  <div className="text-[11px] text-eu-slate-500 mt-1">
                    {b.source} · confidence {b.confidence?.toFixed(2) ?? "n/a"}
                    {b.frame_sec != null ? ` · ${b.frame_sec.toFixed(0)}s` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="EDMO / EUvsDisinfo matches">
          {liveVideo.fact_check_matches.length === 0 ? (
            <p className="text-sm text-eu-slate-500">No fact-check matches above threshold.</p>
          ) : (
            <div className="space-y-2">
              {liveVideo.fact_check_matches.map((m) => (
                <a
                  key={m.factcheck_id}
                  href={m.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="surface-tight p-3 block hover:border-eu-blue/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-eu-ink text-sm">{m.title}</div>
                    <span className="font-mono text-xs text-eu-slate-500 shrink-0">
                      {m.similarity.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-eu-slate-500 mt-1">
                    {m.source} · {m.publication_date} · {m.languages_documented.join(", ")}
                  </div>
                  <p className="text-xs text-eu-slate-600 mt-2 line-clamp-3">{m.summary}</p>
                </a>
              ))}
            </div>
          )}
        </Section>

        {liveVideo.dsa_tdb_cross_refs.length > 0 && (
          <Section title="EU DSA Transparency DB cross-reference">
            <div className="space-y-2">
              {liveVideo.dsa_tdb_cross_refs.map((c, i) => (
                <div key={i} className="surface-tight p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="chip">{c.platform.toUpperCase()}</span>
                    <span className="font-mono text-xs text-eu-slate-500">
                      {c.sample_decision_ground}
                    </span>
                  </div>
                  <div className="text-eu-slate-700">
                    <span className="font-semibold tabular-nums">
                      {c.similar_actions_count.toLocaleString()}
                    </span>{" "}
                    actions taken on similar content (typical action:{" "}
                    <span className="font-mono text-xs">{c.sample_action}</span>).
                  </div>
                  {c.note && (
                    <p className="text-xs text-eu-slate-500 italic mt-1">{c.note}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Transcript">
          <div className="surface-tight p-3 max-h-72 overflow-y-auto space-y-1.5">
            {liveVideo.transcript.segments.map((s, i) => (
              <div key={i} className="text-sm">
                <span className="text-[10px] text-eu-slate-400 font-mono mr-2 align-top">
                  {s.start.toFixed(0)}s · {s.speaker}
                </span>
                <span className="text-eu-slate-700">{s.text}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Provenance & metadata">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-eu-slate-500">Source URL</dt>
            <dd className="font-mono break-all">
              <a href={m.url} target="_blank" rel="noreferrer" className="text-eu-blue hover:underline">
                {m.url}
              </a>
            </dd>
            <dt className="text-eu-slate-500">Hashtags</dt>
            <dd>{m.hashtags.join(" ") || "—"}</dd>
            <dt className="text-eu-slate-500">Platform AI label present</dt>
            <dd>{m.has_platform_ai_label ? "Yes" : "No (audited under AI Act Art. 50)"}</dd>
            <dt className="text-eu-slate-500">Lineage audio ID</dt>
            <dd className="font-mono">{m.audio_id ?? "n/a"}</dd>
            <dt className="text-eu-slate-500">Explicit root source</dt>
            <dd>{m.is_explicit_root_source ? "Yes" : "No"}</dd>
            <dt className="text-eu-slate-500">3rd-party synthetic-media likelihood</dt>
            <dd className="font-mono">{synth != null ? synth.toFixed(2) : "n/a"} <span className="text-eu-slate-400">(metadata only — never gates a gap on its own)</span></dd>
            <dt className="text-eu-slate-500">Severity components</dt>
            <dd className="font-mono">
              reach {liveVideo.severity.components.reach} · recency {liveVideo.severity.components.recency} · signal {liveVideo.severity.components.signal}
            </dd>
            <dt className="text-eu-slate-500">Scoring outcome</dt>
            <dd className="font-mono">
              base {liveVideo.severity.base_score?.toFixed(0) ?? "n/a"} · final {liveVideo.severity.final_score?.toFixed(0) ?? liveVideo.severity.score.toFixed(0)}
              {liveVideo.severity.root_multiplier_applied ? " · root multiplier" : ""}
              {liveVideo.severity.critical_floor_applied ? " · critical floor" : ""}
            </dd>
          </dl>
        </Section>

          <div className="mx-6 mt-6 border-t border-eu-slate-200 pt-4">
            <h3 className="section-heading mb-3">User Actions</h3>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              {!approved && (
                <button
                  type="button"
                  disabled={isReviewing}
                  onClick={() => updateReviewStatus("approved")}
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>
              )}
              {approved && (
                <button
                  type="button"
                  disabled={isReviewing}
                  onClick={() => updateReviewStatus("additional_review")}
                  className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove approval
                </button>
              )}
            </div>
            <Link
              to={`/briefing?video=${liveVideo.metadata.video_id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-eu-blue text-white font-medium hover:bg-eu-blue/90"
            >
              Generate parliamentary briefing →
            </Link>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 mt-6">
      <h3 className="section-heading mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ReachMetric({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-md bg-eu-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-eu-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 font-serif text-lg font-semibold tabular-nums ${
          emphasized ? "text-eu-blue" : "text-eu-ink"
        }`}
      >
        {compactNumber(value)}
      </div>
    </div>
  );
}
