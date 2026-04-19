import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import type {
  AmplificationEdge,
  ForensicAccountSummary,
  ForensicProfile,
  ForensicSignal,
  NarrativeTrendPoint,
} from "../lib/types";
import { compactNumber, relativeDate } from "../lib/format";

const CAVEAT =
  "Investigative signal only. Does not identify a bot, coordinated actor, or legal violation without human review.";

export function Forensics() {
  const [accounts, setAccounts] = useState<ForensicAccountSummary[]>([]);
  const [selectedHandle, setSelectedHandle] = useState("");
  const [profile, setProfile] = useState<ForensicProfile | null>(null);
  const [trends, setTrends] = useState<NarrativeTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([api.forensicAccounts(), api.forensicTrends()])
      .then(([accountRows, trendRows]) => {
        setAccounts(accountRows);
        setTrends(trendRows);
        if (accountRows[0]) {
          setSelectedHandle(accountRows[0].handle);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedHandle) {
      setProfile(null);
      return;
    }
    api.forensicProfile(selectedHandle).then(setProfile);
  }, [selectedHandle]);

  const allEdges = profile?.amplification_edges ?? [];
  const topTrends = useMemo(() => trends.slice(0, 12), [trends]);

  function copyForensicContext() {
    if (!profile) return;
    const signalLines = profile.signals
      .map((s) => `- ${s.title}: ${s.description}`)
      .join("\n");
    const context = [
      "Forensic context: investigative signal only, not a legal determination.",
      `Account: ${profile.summary.handle}`,
      `Analysed videos: ${profile.summary.video_count}`,
      `Known clusters: ${profile.summary.known_clusters.join(", ") || "none"}`,
      `Total reach in corpus: ${profile.summary.total_reach.toLocaleString()}`,
      "Signals:",
      signalLines || "- No forensic signals above baseline.",
    ].join("\n");
    navigator.clipboard.writeText(context);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-eu-ink font-semibold">
          Forensics
        </h1>
        <p className="text-sm text-eu-slate-500 mt-0.5">
          Corpus-based account, narrative, and amplification analysis. Phase 1
          uses only videos already analysed by Narrative Radar.
        </p>
      </header>

      <Caveat />

      {loading ? (
        <div className="text-eu-slate-500 text-sm">Loading forensic corpus…</div>
      ) : accounts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="surface p-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="section-heading mb-1">Account lens</div>
                <h2 className="font-serif text-xl font-semibold text-eu-ink">
                  Public handle profile
                </h2>
              </div>
              <label className="flex min-w-64 flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
                  Public handle
                </span>
                <select
                  value={selectedHandle}
                  onChange={(e) => setSelectedHandle(e.target.value)}
                  className="select"
                >
                  {accounts.map((account) => (
                    <option key={account.handle} value={account.handle}>
                      {account.handle} · {account.video_count} video(s)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {profile && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Stat label="Analysed videos" value={profile.summary.video_count.toString()} />
                  <Stat label="Corpus reach" value={compactNumber(profile.summary.total_reach)} />
                  <Stat label="Languages" value={profile.summary.languages.join(", ").toUpperCase() || "n/a"} />
                  <Stat label="Clusters" value={profile.summary.known_clusters.length.toString()} />
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Panel title="Observed account summary">
                    <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
                      <dt className="text-eu-slate-500">Platforms</dt>
                      <dd>{profile.summary.platforms.join(", ")}</dd>
                      <dt className="text-eu-slate-500">First upload</dt>
                      <dd>{profile.summary.first_observed_upload ? relativeDate(profile.summary.first_observed_upload) : "n/a"}</dd>
                      <dt className="text-eu-slate-500">Last upload</dt>
                      <dd>{profile.summary.last_observed_upload ? relativeDate(profile.summary.last_observed_upload) : "n/a"}</dd>
                      <dt className="text-eu-slate-500">Engagement</dt>
                      <dd>
                        median {compactNumber(profile.engagement_stats.median_views ?? 0)} · max{" "}
                        {compactNumber(profile.engagement_stats.max_views ?? 0)}
                      </dd>
                    </dl>
                  </Panel>

                  <Panel title="Posting cadence">
                    <MiniBars values={profile.posting_cadence} empty="No cadence data yet." />
                  </Panel>

                  <Panel title="Hashtags">
                    <ChipCounts values={profile.hashtag_counts} empty="No hashtags in analysed videos." />
                  </Panel>

                  <Panel title="Narrative clusters">
                    <ChipCounts values={profile.narrative_clusters} empty="No cluster assignments yet." />
                  </Panel>
                </div>

                <section>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-t border-eu-slate-100 pt-5">
                    <div>
                      <div className="section-heading">Signals</div>
                      <h3 className="font-serif text-lg font-semibold text-eu-ink">
                        Descriptive forensic indicators
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={copyForensicContext}
                      className="text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50"
                    >
                      {copied ? "Copied" : "Copy forensic context"}
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {profile.signals.map((signal) => (
                      <SignalCard key={`${signal.signal_type}-${signal.title}`} signal={signal} />
                    ))}
                  </div>
                </section>

                {profile.missing_data_notes.length > 0 && (
                  <Panel title="Missing data notes">
                    <ul className="space-y-1.5 text-sm text-eu-slate-600">
                      {profile.missing_data_notes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>
            )}
          </section>

          <section className="surface p-5">
            <div className="mb-3">
              <div className="section-heading">Narrative trends</div>
              <h2 className="font-serif text-xl font-semibold text-eu-ink">
                Stored-corpus trend points
              </h2>
            </div>
            <Caveat compact />
            {topTrends.length === 0 ? (
              <div className="surface-tight p-4 text-sm text-eu-slate-500">
                No trend data yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-eu-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Cluster</th>
                      <th className="px-3 py-2 text-left">Language</th>
                      <th className="px-3 py-2 text-left">Hashtag</th>
                      <th className="px-3 py-2 text-right">Videos</th>
                      <th className="px-3 py-2 text-right">Reach</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTrends.map((trend) => (
                      <tr key={`${trend.date_bucket}-${trend.cluster_id}-${trend.language}-${trend.hashtag}`} className="border-t border-eu-slate-100">
                        <td className="px-3 py-2">{trend.date_bucket}</td>
                        <td className="px-3 py-2 capitalize">{(trend.cluster_id ?? "unclustered").replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">{trend.language?.toUpperCase() ?? "n/a"}</td>
                        <td className="px-3 py-2">{trend.hashtag ?? "n/a"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{trend.video_count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{compactNumber(trend.total_reach)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="surface p-5">
            <div className="mb-3">
              <div className="section-heading">Amplification signals</div>
              <h2 className="font-serif text-xl font-semibold text-eu-ink">
                Shared audio and same-window cluster links
              </h2>
            </div>
            <Caveat compact />
            <AmplificationTable edges={allEdges} />
          </section>
        </>
      )}
    </div>
  );
}

function Caveat({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-md border border-amber-200 bg-amber-50 text-amber-950 ${compact ? "mb-3 p-3 text-xs" : "p-4 text-sm"}`}>
      {CAVEAT}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface p-12 text-center">
      <h2 className="font-serif text-xl font-semibold text-eu-ink">
        No forensic corpus yet
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-eu-slate-500">
        Ingest or analyze videos first. The Forensics tab only reads the
        existing analysed-video store and does not start scraping, monitoring,
        or external provider calls.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-tight min-h-24 p-5">
      <div className="section-heading mb-2">{label}</div>
      <div className="metric text-2xl">{value || "n/a"}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface-tight min-h-28 p-5">
      <h3 className="mb-4 text-sm font-semibold text-eu-ink">{title}</h3>
      {children}
    </section>
  );
}

function ChipCounts({
  values,
  empty,
}: {
  values: Record<string, number>;
  empty: string;
}) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (!entries.length) return <p className="text-sm text-eu-slate-500">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([label, count]) => (
        <span key={label} className="chip px-2.5 py-1">
          {label.replace(/_/g, " ")} · {count}
        </span>
      ))}
    </div>
  );
}

function MiniBars({
  values,
  empty,
}: {
  values: Record<string, number>;
  empty: string;
}) {
  const entries = Object.entries(values);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  if (!entries.length) return <p className="text-sm text-eu-slate-500">{empty}</p>;
  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-xs">
          <span className="font-mono text-eu-slate-500">{label}</span>
          <div className="h-2 rounded bg-eu-slate-100">
            <div
              className="h-2 rounded bg-eu-blue"
              style={{ width: `${Math.max(8, (value / max) * 100)}%` }}
            />
          </div>
          <span className="text-right tabular-nums text-eu-slate-600">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal }: { signal: ForensicSignal }) {
  const tone =
    signal.severity === "high"
      ? "border-sev-critical/30 bg-sev-critical/5"
      : signal.severity === "medium"
        ? "border-sev-medium/30 bg-sev-medium/5"
        : "border-eu-slate-200 bg-white";
  return (
    <article className={`surface-tight p-4 ${tone}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="chip">{signal.signal_type.replace(/_/g, " ")}</span>
        <span className="badge bg-eu-slate-100 text-eu-slate-700 border border-eu-slate-200">
          {signal.severity}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-eu-ink">{signal.title}</h4>
      <p className="mt-1 text-sm leading-6 text-eu-slate-600">{signal.description}</p>
      <p className="mt-3 text-[11px] italic text-eu-slate-500">{signal.caveat}</p>
    </article>
  );
}

function AmplificationTable({ edges }: { edges: AmplificationEdge[] }) {
  if (!edges.length) {
    return (
      <div className="surface-tight p-4 text-sm text-eu-slate-500">
        No amplification edges for the selected account yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-eu-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-left">Related</th>
            <th className="px-3 py-2 text-left">Relation</th>
            <th className="px-3 py-2 text-left">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {edges.slice(0, 20).map((edge, index) => (
            <tr key={`${edge.source_handle}-${edge.related_handle}-${edge.relation_type}-${index}`} className="border-t border-eu-slate-100">
              <td className="px-3 py-2">{edge.source_handle}</td>
              <td className="px-3 py-2">{edge.related_handle}</td>
              <td className="px-3 py-2">{edge.relation_type.replace(/_/g, " ")}</td>
              <td className="px-3 py-2 font-mono text-xs text-eu-slate-500">
                {Object.entries(edge.shared_evidence)
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
