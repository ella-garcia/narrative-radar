import { useEffect } from "react";
import { Link } from "react-router-dom";
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
}: {
  video: AnalyzedVideo;
  onClose: () => void;
}) {
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

  const m = video.metadata;
  const synth = video.synthetic_media_likelihood;
  const lowConf = video.transcript.confidence !== "high";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-eu-ink/40" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-[640px] max-w-full h-full bg-eu-slate-50 overflow-y-auto shadow-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-eu-slate-200 px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="chip">{platformLabel(m.platform)}</span>
                <span className="chip">{flag(m.language)} {m.language.toUpperCase()}</span>
                {video.cluster_id && (
                  <span className="chip bg-eu-blue/5 text-eu-blue">
                    {video.cluster_id.replace(/_/g, " ")}
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
            <button
              onClick={onClose}
              className="text-eu-slate-500 hover:text-eu-ink p-1 rounded hover:bg-eu-slate-100"
            >
              ✕
            </button>
          </div>
          <div className="mt-3">
            <SeverityMeter score={video.severity.score} label={video.severity.label} />
          </div>
        </div>

        {lowConf && (
          <div className="mx-6 mt-4 surface-tight bg-amber-50 border-amber-200 px-4 py-3 text-sm text-amber-900">
            ⚠ <strong>Human review required.</strong>{" "}
            {video.transcript.low_confidence_warning ??
              `ASR + LLM confidence is ${video.transcript.confidence}.`}
          </div>
        )}

        <Section title="Compliance gap indicators">
          {video.compliance_gaps.length === 0 ? (
            <p className="text-sm text-eu-slate-500">No gap indicators above threshold for this item.</p>
          ) : (
            <div className="space-y-3">
              {video.compliance_gaps.map((g) => (
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

        <Section title="Extracted claims">
          <div className="space-y-2">
            {video.claims.map((c, i) => (
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

        <Section title="EDMO / EUvsDisinfo matches">
          {video.fact_check_matches.length === 0 ? (
            <p className="text-sm text-eu-slate-500">No fact-check matches above threshold.</p>
          ) : (
            <div className="space-y-2">
              {video.fact_check_matches.map((m) => (
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

        {video.dsa_tdb_cross_refs.length > 0 && (
          <Section title="EU DSA Transparency DB cross-reference">
            <div className="space-y-2">
              {video.dsa_tdb_cross_refs.map((c, i) => (
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
            {video.transcript.segments.map((s, i) => (
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
            <dt className="text-eu-slate-500">3rd-party synthetic-media likelihood</dt>
            <dd className="font-mono">{synth != null ? synth.toFixed(2) : "n/a"} <span className="text-eu-slate-400">(metadata only — never gates a gap on its own)</span></dd>
            <dt className="text-eu-slate-500">Severity components</dt>
            <dd className="font-mono">
              reach {video.severity.components.reach} · recency {video.severity.components.recency} · signal {video.severity.components.signal}
            </dd>
          </dl>
        </Section>

        <div className="px-6 pb-8">
          <Link
            to={`/briefing?video=${video.metadata.video_id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-eu-blue text-white font-medium hover:bg-eu-blue/90"
          >
            Generate parliamentary briefing →
          </Link>
        </div>
      </aside>
    </div>
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
