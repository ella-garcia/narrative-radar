import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getIdentity, setIdentity } from "../lib/api";
import type { AuditResponse } from "../lib/types";
import { relativeDate } from "../lib/format";

const ACTION_PALETTE: Record<string, string> = {
  ingest: "bg-eu-blue/10 text-eu-blue border-eu-blue/30",
  ingest_failed: "bg-sev-medium/10 text-sev-medium border-sev-medium/30",
  briefing_generated: "bg-emerald-100 text-emerald-800 border-emerald-300",
  storage_cleared: "bg-sev-critical/10 text-sev-critical border-sev-critical/30",
  default: "bg-eu-slate-100 text-eu-slate-700 border-eu-slate-200",
};

const ACTIONS = [
  { value: "", label: "All actions" },
  { value: "ingest", label: "Ingest" },
  { value: "briefing_generated", label: "Briefing generated" },
  { value: "storage_cleared", label: "Storage cleared" },
  { value: "ingest_failed", label: "Ingest failed" },
];

export function Audit() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [identity, setIdent] = useState(getIdentity());

  const refresh = useCallback(async () => {
    try {
      const r = await api.audit({
        action: actionFilter || undefined,
        actor: actorFilter || undefined,
        limit: 500,
      });
      setData(r);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setData(null);
    }
  }, [actionFilter, actorFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const days: { day: string; records: AuditResponse["records"] }[] = [];
    let current: { day: string; records: AuditResponse["records"] } | null = null;
    for (const r of data.records) {
      const day = r.timestamp.slice(0, 10);
      if (!current || current.day !== day) {
        current = { day, records: [] };
        days.push(current);
      }
      current.records.push(r);
    }
    return days;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-eu-ink font-semibold">
            Audit log
          </h1>
          <p className="text-sm text-eu-slate-500 mt-0.5">
            Tamper-evident, append-only record of every state-changing operation.{" "}
            <span className="italic">DPO view — gated by role.</span>
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Identity panel — hackathon-grade SSO simulation */}
      <div className="surface p-4">
        <div className="section-heading mb-2">Acting as (sent on every state-changing API call)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">Actor</span>
            <input
              value={identity.actor}
              onChange={(e) => setIdent({ ...identity, actor: e.target.value })}
              onBlur={() => setIdentity(identity)}
              className="select"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">Role</span>
            <select
              value={identity.role}
              onChange={(e) => {
                const next = { ...identity, role: e.target.value };
                setIdent(next);
                setIdentity(next);
              }}
              className="select"
            >
              <option value="aide">aide</option>
              <option value="mp">mp</option>
              <option value="dpo">dpo</option>
            </select>
          </label>
          <div className="text-xs text-eu-slate-500 italic flex items-end pb-1">
            Production replaces this with the institution's SSO + RBAC. The DPO
            view is always queryable here regardless — see{" "}
            <code className="font-mono ml-1">main.py: _require_dpo()</code>.
          </div>
        </div>
      </div>

      {error && (
        <div className="surface p-4 text-sev-critical text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Total events" value={data.chain.total_records.toString()} />
            <Stat
              label="Chain integrity"
              value={data.chain.intact ? "Intact" : "Tampered"}
              tone={data.chain.intact ? "good" : "bad"}
              sub={
                data.chain.intact
                  ? "SHA-256 chain verifies cleanly"
                  : `Breaks at: ${data.chain.broken_indices.join(", ")}`
              }
            />
            <Stat label="Showing" value={`${data.count_returned} / ${data.count_total}`} />
            <Stat
              label="Head hash"
              value={
                <span className="font-mono text-sm break-all">
                  {data.chain.head_hash}
                </span>
              }
            />
          </div>

          <div className="surface p-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
                Action
              </span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="select"
              >
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
                Actor (substring)
              </span>
              <input
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="e.g. alice@parl"
                className="select"
              />
            </label>
            <button
              onClick={() => {
                setActionFilter("");
                setActorFilter("");
              }}
              className="text-xs text-eu-blue hover:underline ml-auto"
            >
              Clear
            </button>
          </div>

          {data.records.length === 0 ? (
            <div className="surface p-12 text-center text-sm text-eu-slate-500">
              No events match these filters.
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-eu-slate-50 text-[10px] uppercase tracking-wider text-eu-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">When</th>
                    <th className="text-left px-3 py-2 font-semibold">Actor</th>
                    <th className="text-left px-3 py-2 font-semibold">Role</th>
                    <th className="text-left px-3 py-2 font-semibold">Action</th>
                    <th className="text-left px-3 py-2 font-semibold">Detail</th>
                    <th className="text-left px-3 py-2 font-semibold">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((g) => (
                    <>
                      <tr key={`day-${g.day}`} className="bg-eu-slate-50/60">
                        <td colSpan={6} className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-eu-slate-500 font-semibold">
                          {g.day}
                        </td>
                      </tr>
                      {g.records.map((r) => (
                        <tr key={r.entry_hash} className="border-t border-eu-slate-100 hover:bg-eu-slate-50/40">
                          <td className="px-3 py-2 align-top">
                            <div className="text-xs text-eu-slate-600">
                              {r.timestamp.slice(11, 19)}
                            </div>
                            <div className="text-[10px] text-eu-slate-400">
                              {relativeDate(r.timestamp)}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-xs font-mono">{r.actor}</td>
                          <td className="px-3 py-2 align-top">
                            <span className="chip">{r.role}</span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`badge border ${
                                ACTION_PALETTE[r.action] ?? ACTION_PALETTE.default
                              } font-mono`}
                            >
                              {r.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <DetailCell detail={r.detail} />
                          </td>
                          <td className="px-3 py-2 align-top text-[10px] font-mono text-eu-slate-500 break-all max-w-[140px]">
                            {r.entry_hash}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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
  value: React.ReactNode;
  sub?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] uppercase tracking-wider text-eu-slate-500">{label}</div>
      <div
        className={`metric mt-1 ${
          tone === "good" ? "text-sev-low" : tone === "bad" ? "text-sev-critical" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-eu-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function DetailCell({ detail }: { detail: Record<string, any> }) {
  if (!detail || Object.keys(detail).length === 0) {
    return <span className="text-eu-slate-400 italic text-xs">—</span>;
  }
  // Promote the most relevant fields inline; everything else under a disclosure.
  const inline: { k: string; v: string }[] = [];
  const PROMOTE = [
    "video_id",
    "url",
    "constituency",
    "language",
    "platform",
    "severity_label",
    "severity_score",
    "gap_refs",
    "cluster_id",
    "n_findings",
    "cited_articles",
    "briefing_hash",
    "records_removed",
    "error",
  ];
  for (const k of PROMOTE) {
    if (detail[k] === undefined || detail[k] === null) continue;
    const v = Array.isArray(detail[k]) ? detail[k].join(", ") : String(detail[k]);
    inline.push({ k, v });
  }
  return (
    <div className="text-xs">
      <ul className="space-y-0.5">
        {inline.slice(0, 4).map(({ k, v }) => (
          <li key={k} className="flex gap-2">
            <span className="text-eu-slate-500 shrink-0">{k}:</span>
            <span className="font-mono break-all text-eu-slate-700 truncate" title={v}>
              {v.length > 80 ? v.slice(0, 80) + "…" : v}
            </span>
          </li>
        ))}
      </ul>
      {Object.keys(detail).length > 4 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[10px] text-eu-slate-500 hover:text-eu-blue">
            full payload
          </summary>
          <pre className="text-[10px] mt-1 bg-eu-slate-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
