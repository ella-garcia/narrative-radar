import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { AnalyzedVideo, Briefing as BriefingT } from "../lib/types";
import { compactNumber, flag } from "../lib/format";

export function Briefing() {
  const [params] = useSearchParams();
  const initialIds = (params.get("video") ?? "").split(",").filter(Boolean);
  const [videos, setVideos] = useState<AnalyzedVideo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));
  const [briefing, setBriefing] = useState<BriefingT | null>(null);
  const [loading, setLoading] = useState(false);
  const [requester, setRequester] = useState("Parliamentary Aide");
  const [constituency, setConstituency] = useState("RO");

  useEffect(() => {
    api.listVideos().then(setVideos);
  }, []);

  useEffect(() => {
    if (initialIds.length && videos.length && !briefing) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length]);

  async function generate() {
    setLoading(true);
    try {
      const b = await api.briefing({
        video_ids: selected.size ? Array.from(selected) : undefined,
        constituency,
        requester_name: requester,
      });
      setBriefing(b);
    } finally {
      setLoading(false);
    }
  }

  function printDoc() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-eu-ink font-semibold">
          Parliamentary briefing
        </h1>
        <p className="text-sm text-eu-slate-500 mt-0.5">
          Two-page factual briefing citing specific DSA / AI Act articles, ready
          for printing or download.
        </p>
      </div>

      <div className="surface p-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
              Requester
            </span>
            <input
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              className="select"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">
              Constituency
            </span>
            <select
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
              className="select"
            >
              {["RO", "DE", "FR", "PL", "IT", "ES", "NL", "SK", ""].map((c) => (
                <option key={c || "all"} value={c}>
                  {c ? `${flag(c)} ${c}` : "All / cross-border"}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50 w-full md:w-auto"
            >
              {loading ? "Generating…" : "Generate briefing"}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <div className="section-heading mb-2">
            Items to include {selected.size > 0 ? `(${selected.size} selected)` : "(top 5 if none selected)"}
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {videos.map((v) => (
              <label
                key={v.metadata.video_id}
                className="flex items-center gap-3 px-2 py-1 rounded hover:bg-eu-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.metadata.video_id)}
                  onChange={(e) => {
                    const s = new Set(selected);
                    if (e.target.checked) s.add(v.metadata.video_id);
                    else s.delete(v.metadata.video_id);
                    setSelected(s);
                  }}
                />
                <span className="font-mono text-xs text-eu-slate-500 w-16 shrink-0">
                  sev {v.severity.score.toFixed(0)}
                </span>
                <span className="text-sm truncate">{v.metadata.title}</span>
                <span className="text-xs text-eu-slate-500 ml-auto">
                  {flag(v.metadata.language)} · {compactNumber(v.metadata.view_count)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {briefing && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2 print:hidden">
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(briefing, null, 2))}
              className="text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50"
            >
              Copy JSON
            </button>
            <button
              onClick={printDoc}
              className="text-xs px-3 py-1.5 bg-eu-blue text-white rounded-md hover:bg-eu-blue/90"
            >
              Print / Save PDF
            </button>
          </div>
          <BriefingDocument briefing={briefing} />
        </div>
      )}
    </div>
  );
}

function BriefingDocument({ briefing }: { briefing: BriefingT }) {
  const issued = new Date(briefing.issued_at);
  const hash = briefing.briefing_hash ?? "";
  return (
    <article className="briefing-doc bg-white shadow-card border border-eu-slate-200 rounded-lg max-w-[820px] mx-auto print:shadow-none print:border-0 print:rounded-none print:max-w-none">
      {/* Running footer for print only — picked up by @page bottom-left */}
      <div className="briefing-footer hidden print:flex">
        <span>Narrative Radar · v0.1 · indicator output, not a legal determination</span>
        <span className="font-mono">{hash}</span>
      </div>

      {/* Banner */}
      <div className="briefing-banner px-10 py-6 border-b-4 border-eu-gold bg-eu-blue text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">
              Narrative Radar — Parliamentary Compliance Briefing
            </div>
            <h2 className="font-serif text-2xl mt-1">{briefing.title}</h2>
          </div>
          <div className="text-right text-[11px] opacity-90">
            <div>Issued {issued.toUTCString().replace(":00 GMT", " GMT")}</div>
            <div>For: {briefing.requester}</div>
            {briefing.constituency && <div>Constituency: {briefing.constituency}</div>}
          </div>
        </div>
      </div>

      <div className="briefing-body px-10 py-6 font-serif text-eu-ink leading-relaxed">
        <div className="briefing-section">
          <Section title="Executive summary">
            <p>{briefing.executive_summary}</p>
          </Section>
        </div>

        <div className="briefing-section">
          <Section title="Findings">
            <ol className="list-decimal pl-5 space-y-1.5">
              {briefing.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="briefing-section">
          <Section title="Cited articles">
            <div className="space-y-3">
              {briefing.cited_articles.map((a) => (
                <div key={a.ref} className="briefing-article border-l-4 border-eu-blue/40 pl-3">
                  <div className="font-sans font-semibold text-sm">
                    {a.ref}
                    {a.short && (
                      <span className="font-normal text-eu-slate-500"> — {a.short}</span>
                    )}
                  </div>
                  {a.summary && (
                    <p className="text-sm text-eu-slate-700 mt-0.5">{a.summary}</p>
                  )}
                  {a.indicator_basis && (
                    <p className="text-xs text-eu-slate-500 mt-1 italic">
                      Indicator basis: {a.indicator_basis}
                    </p>
                  )}
                  <div className="text-[11px] font-mono text-eu-slate-500 mt-1">
                    {a.instrument} · <a href={a.official_url} target="_blank" rel="noreferrer" className="underline">official text</a>
                    {a.enforcement_date && ` · enforceable ${a.enforcement_date}`}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="briefing-section briefing-evidence">
          <Section title="Evidence pack">
            <div className="space-y-4">
              {briefing.evidence.map((e: any) => (
                <div key={e.video_id} className="briefing-evidence-item surface-tight font-sans p-4 text-sm">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="font-semibold text-eu-ink">{e.title}</div>
                    <div className="text-xs text-eu-slate-500">
                      {flag(e.language)} {e.platform} · {compactNumber(e.reach)} views
                    </div>
                  </div>
                  <div className="text-xs text-eu-slate-500 mb-2">
                    {e.author} · <a href={e.url} target="_blank" rel="noreferrer" className="text-eu-blue underline break-all">{e.url}</a>
                  </div>
                  {e.transcript_excerpt && (
                    <blockquote className="border-l-2 border-eu-slate-200 pl-3 text-xs text-eu-slate-600 italic mt-1">
                      {e.transcript_excerpt}
                    </blockquote>
                  )}
                  {e.edmo_matches?.length > 0 && (
                    <div className="text-xs mt-2">
                      <span className="font-semibold">Matched fact-checks:</span>{" "}
                      {e.edmo_matches.map((m: any) => (
                        <a
                          key={m.title}
                          href={m.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-eu-blue underline mr-2"
                        >
                          {m.source} ({m.similarity.toFixed(2)})
                        </a>
                      ))}
                    </div>
                  )}
                  {e.dsa_tdb_cross_refs?.length > 0 && (
                    <div className="text-xs mt-1">
                      <span className="font-semibold">DSA TDB:</span>{" "}
                      {e.dsa_tdb_cross_refs.map((c: any) => (
                        <span key={c.decision_ground} className="mr-2">
                          {c.actions_taken.toLocaleString()} × {c.decision_ground}
                        </span>
                      ))}
                    </div>
                  )}
                  {e.gaps?.length > 0 && (
                    <div className="text-xs mt-1">
                      <span className="font-semibold">Indicators:</span>{" "}
                      {e.gaps.map((g: any) => (
                        <span key={g.article_ref} className="mr-2 font-mono">
                          {g.article_ref} ({g.severity})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="briefing-section mt-8 pt-4 border-t border-eu-slate-200 text-[11px] text-eu-slate-500 italic">
          {briefing.disclaimer}
        </div>
        <div className="text-[10px] text-eu-slate-400 mt-2 font-mono flex flex-wrap gap-x-3 gap-y-1">
          <span>Generated by Narrative Radar v0.1</span>
          <span>· {issued.toISOString()}</span>
          {hash && <span>· {hash}</span>}
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] text-eu-blue font-semibold mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}
