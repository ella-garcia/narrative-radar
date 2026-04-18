import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { AnalyzedVideo } from "../lib/types";
import { IngestBar } from "../components/IngestBar";
import { VideoCard } from "../components/VideoCard";
import { VideoDetailDrawer } from "../components/VideoDetailDrawer";
import { flag } from "../lib/format";

const SEVERITIES = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ARTICLES = [
  { value: "", label: "All gap types" },
  { value: "DSA Art. 26", label: "DSA Art. 26 — coordinated" },
  { value: "DSA Art. 34-35", label: "DSA Art. 34-35 — systemic risk" },
  { value: "AI Act Art. 50", label: "AI Act Art. 50 — disclosure" },
];

const CONSTITUENCIES = ["", "RO", "DE", "FR", "PL", "IT", "ES", "NL", "SK"];

export function Feed() {
  const [videos, setVideos] = useState<AnalyzedVideo[]>([]);
  const [open, setOpen] = useState<AnalyzedVideo | null>(null);
  const [severity, setSeverity] = useState("");
  const [language, setLanguage] = useState("");
  const [article, setArticle] = useState("");
  const [constituency, setConstituency] = useState("");

  const refresh = useCallback(async () => {
    const v = await api.listVideos({
      severity: severity || undefined,
      language: language || undefined,
      article_ref: article || undefined,
      constituency: constituency || undefined,
    });
    setVideos(v);
  }, [severity, language, article, constituency]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!videos.some((v) => v.derivative_spread.status === "pending")) return;
    const t = window.setInterval(() => {
      refresh();
    }, 4000);
    return () => window.clearInterval(t);
  }, [videos, refresh]);

  const languages = useMemo(() => {
    const all = new Set<string>();
    videos.forEach((v) => all.add(v.metadata.language));
    return Array.from(all).sort();
  }, [videos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-eu-ink font-semibold">Video feed</h1>
        <p className="text-sm text-eu-slate-500 mt-0.5">
          All ingested items, sorted by severity. Click any card for full evidence.
        </p>
      </div>

      <IngestBar onIngested={refresh} constituency={constituency || undefined} />

      <div className="surface p-4 flex flex-wrap items-end gap-3">
        <Field label="Constituency banner">
          <select
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
            className="select"
          >
            {CONSTITUENCIES.map((c) => (
              <option key={c || "all"} value={c}>
                {c ? `${flag(c)} ${c}` : "All constituencies"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="select"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="select"
          >
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {flag(l)} {l.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gap type">
          <select
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            className="select"
          >
            {ARTICLES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <button
          onClick={() => {
            setSeverity(""); setLanguage(""); setArticle(""); setConstituency("");
          }}
          className="text-xs text-eu-blue hover:underline ml-auto"
        >
          Clear filters
        </button>
      </div>

      {constituency && (
        <div className="surface-tight px-4 py-3 bg-eu-blue/5 border-eu-blue/20 text-sm text-eu-ink">
          {flag(constituency)} Showing items relevant to <strong>{constituency}</strong>{" "}
          parliamentary office. Constituency banner attaches to any briefing you generate.
        </div>
      )}

      {videos.length === 0 ? (
        <div className="surface p-12 text-center text-eu-slate-500 text-sm">
          No items match these filters yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {videos.map((v) => (
            <VideoCard
              key={v.metadata.video_id}
              video={v}
              onOpen={() => setOpen(v)}
            />
          ))}
        </div>
      )}

      {open && <VideoDetailDrawer video={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-eu-slate-500">{label}</span>
      {children}
    </label>
  );
}
