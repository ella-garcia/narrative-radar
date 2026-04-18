import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { AnalyzedVideo, DashboardSummary } from "../lib/types";
import { compactNumber, severityColor } from "../lib/format";
import { IngestBar } from "../components/IngestBar";
import { VideoCard } from "../components/VideoCard";
import { VideoDetailDrawer } from "../components/VideoDetailDrawer";
import { ClusterMap } from "../components/ClusterMap";

export function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [open, setOpen] = useState<AnalyzedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!data) return;
    const hasPending = data.top_threats.some((v) => v.derivative_spread.status === "pending");
    if (!hasPending) return;
    const t = window.setInterval(() => {
      refresh();
    }, 4000);
    return () => window.clearInterval(t);
  }, [data, refresh]);

  if (error) {
    return (
      <div className="surface p-6 text-sev-critical">
        Backend error: {error}
        <p className="text-eu-slate-500 text-sm mt-2">
          Make sure the FastAPI backend is running on port 8000.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-eu-ink font-semibold">Situation overview</h1>
          <p className="text-sm text-eu-slate-500 mt-0.5">
            Active short-form video items flagged with potential DSA / AI Act compliance gaps.
          </p>
        </div>
        <Link
          to="/feed"
          className="text-sm text-eu-blue hover:underline"
        >
          Full video feed →
        </Link>
      </div>

      <IngestBar onIngested={refresh} />

      {data && data.total_videos === 0 ? (
        <div className="surface p-12 text-center">
          <h3 className="font-serif text-lg text-eu-ink">No videos analysed yet</h3>
          <p className="text-eu-slate-500 text-sm mt-1">
            Use the bar above — pick a one-click demo case to see the pipeline in action.
          </p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              label="Items analysed"
              value={data.total_videos.toString()}
              tone="info"
            />
            <Stat
              label="High / Critical"
              value={(
                (data.by_severity.high ?? 0) +
                (data.by_severity.critical ?? 0)
              ).toString()}
              tone="high"
            />
            <Stat
              label="DSA Art. 34-35 indicators"
              value={(data.gap_counts_by_article["DSA Art. 34-35"] ?? 0).toString()}
              sub="systemic risk · platform-admission backed"
            />
            <Stat
              label="DSA Art. 26 indicators"
              value={(data.gap_counts_by_article["DSA Art. 26"] ?? 0).toString()}
              sub="coordinated / cross-language spread"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 surface p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg text-eu-ink font-semibold">
                  Narrative cluster map
                </h2>
                <span className="text-xs text-eu-slate-500">
                  size = total reach · y = max severity · x = languages
                </span>
              </div>
              <ClusterMap clusters={data.clusters} />
              {data.clusters.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {data.clusters.map((c) => (
                    <div key={c.cluster_id} className="surface-tight p-2 text-xs">
                      <div className="font-medium text-eu-ink truncate capitalize">
                        {c.cluster_id.replace(/_/g, " ")}
                      </div>
                      <div className="text-eu-slate-500 mt-0.5">
                        {c.video_ids.length} videos · {compactNumber(c.total_reach)}
                      </div>
                      <div className="text-eu-slate-500">
                        {c.languages.length}× lang ·{" "}
                        <span className={severityColor(severityToLabel(c.max_severity))}>
                          sev {c.max_severity.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface p-5">
              <h2 className="font-serif text-lg text-eu-ink font-semibold mb-3">
                Compliance gap counter
              </h2>
              <ul className="space-y-3">
                {Object.entries(data.gap_counts_by_article).length === 0 && (
                  <li className="text-sm text-eu-slate-500 italic">
                    No gap indicators yet.
                  </li>
                )}
                {Object.entries(data.gap_counts_by_article).map(([ref, n]) => (
                  <li
                    key={ref}
                    className="flex items-baseline justify-between border-b border-eu-slate-100 pb-2 last:border-0"
                  >
                    <span className="font-mono text-sm text-eu-ink">{ref}</span>
                    <span className="font-serif text-2xl text-eu-blue tabular-nums">
                      {n}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/legal"
                className="mt-4 inline-block text-xs text-eu-blue hover:underline"
              >
                Read article texts →
              </Link>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg text-eu-ink font-semibold">
                Top active threats
              </h2>
              <button
                onClick={() => navigate("/briefing")}
                className="text-sm text-eu-blue hover:underline"
              >
                Build a briefing from the top items →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.top_threats.map((v) => (
                <VideoCard
                  key={v.metadata.video_id}
                  video={v}
                  onOpen={() => setOpen(v)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-eu-slate-500 text-sm">Loading…</div>
      )}

      {open && <VideoDetailDrawer video={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "info" | "high";
}) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] uppercase tracking-wider text-eu-slate-500">
        {label}
      </div>
      <div
        className={`metric mt-1 ${
          tone === "high" ? "text-sev-high" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-eu-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function severityToLabel(s: number): string {
  if (s >= 75) return "critical";
  if (s >= 50) return "high";
  if (s >= 25) return "medium";
  return "low";
}
