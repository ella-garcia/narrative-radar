import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { compactNumber } from "../lib/format";
export function IngestBar({ onIngested, constituency, }) {
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [demos, setDemos] = useState([]);
    useEffect(() => {
        api.demoVideos().then(setDemos).catch(() => setDemos([]));
    }, []);
    async function ingest(target) {
        const u = target ?? url;
        if (!u.trim())
            return;
        setBusy(true);
        setError(null);
        try {
            await api.ingest(u.trim(), constituency);
            setUrl("");
            onIngested();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("div", { className: "section-heading mb-1", children: "Ingest a video" }), _jsx("p", { className: "text-sm text-eu-slate-500", children: "Paste a TikTok / YouTube Shorts / Instagram / X URL, or pick a pre-cached demo case." })] }), busy && (_jsx("div", { className: "text-xs text-eu-blue animate-pulse", children: "Running pipeline \u00B7 transcribe \u00B7 extract claims \u00B7 match \u00B7 check DSA..." }))] }), _jsxs("form", { onSubmit: (e) => {
                    e.preventDefault();
                    ingest();
                }, className: "flex gap-2", children: [_jsx("input", { type: "url", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://www.tiktok.com/@...", className: "flex-1 px-3 py-2 border border-eu-slate-200 rounded-md text-sm font-mono focus:border-eu-blue focus:outline-none focus:ring-1 focus:ring-eu-blue", disabled: busy }), _jsx("button", { type: "submit", disabled: busy || !url.trim(), className: "px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50 disabled:cursor-not-allowed", children: "Analyse" })] }), error && (_jsx("div", { className: "mt-2 text-xs text-sev-critical bg-sev-critical/5 px-3 py-1.5 rounded", children: error })), demos.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500 mb-1.5", children: "One-click demo cases" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: demos.map((d) => (_jsxs("button", { onClick: () => ingest(d.url), disabled: busy, className: "text-left px-3 py-2 rounded-md border border-eu-slate-200 hover:border-eu-blue hover:bg-eu-blue/5 text-eu-slate-700 disabled:opacity-50 transition-colors", title: `${d.title}\n${compactNumber(d.view_count)} views · ${d.derivative_count} derivative video(s) · ${compactNumber(d.derivative_aggregate_reach)} derivative reach`, children: [_jsxs("span", { className: "block text-xs font-medium", children: [d.narrative_hint?.replace(/_/g, " ") ?? d.video_id, " \u00B7 ", d.language.toUpperCase()] }), _jsxs("span", { className: "block mt-0.5 text-[10px] text-eu-slate-500 tabular-nums", children: [compactNumber(d.view_count), " views \u00B7 spread ", d.derivative_count, d.derivative_count > 0 ? ` · ${compactNumber(d.derivative_aggregate_reach)} reach` : "", d.derivative_languages.length > 0 ? ` · langs ${d.derivative_languages.map((l) => l.toUpperCase()).join("/")}` : ""] })] }, d.video_id))) })] }))] }));
}
