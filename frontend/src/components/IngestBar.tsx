import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { DemoVideo } from "../lib/types";

export function IngestBar({
  onIngested,
  constituency,
}: {
  onIngested: () => void;
  constituency?: string;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demos, setDemos] = useState<DemoVideo[]>([]);

  useEffect(() => {
    api.demoVideos().then(setDemos).catch(() => setDemos([]));
  }, []);

  async function ingest(target?: string) {
    const u = target ?? url;
    if (!u.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.ingest(u.trim(), constituency);
      setUrl("");
      onIngested();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="section-heading mb-1">Ingest a video</div>
          <p className="text-sm text-eu-slate-500">
            Paste a TikTok / YouTube Shorts / Instagram / X URL, or pick a pre-cached demo case.
          </p>
        </div>
        {busy && (
          <div className="text-xs text-eu-blue animate-pulse">
            Running pipeline · transcribe · extract claims · match · check DSA…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ingest();
        }}
        className="flex gap-2"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@..."
          className="flex-1 px-3 py-2 border border-eu-slate-200 rounded-md text-sm font-mono focus:border-eu-blue focus:outline-none focus:ring-1 focus:ring-eu-blue"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analyse
        </button>
      </form>

      {error && (
        <div className="mt-2 text-xs text-sev-critical bg-sev-critical/5 px-3 py-1.5 rounded">
          {error}
        </div>
      )}

      {demos.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-eu-slate-500 mb-1.5">
            One-click demo cases
          </div>
          <div className="flex flex-wrap gap-1.5">
            {demos.map((d) => (
              <button
                key={d.video_id}
                onClick={() => ingest(d.url)}
                disabled={busy}
                className="text-xs px-2 py-1 rounded border border-eu-slate-200 hover:border-eu-blue hover:bg-eu-blue/5 text-eu-slate-700 disabled:opacity-50"
                title={d.title}
              >
                {d.narrative_hint?.replace(/_/g, " ") ?? d.video_id} · {d.language.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
