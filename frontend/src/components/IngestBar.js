import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
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
    return (_jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("div", { className: "section-heading mb-1", children: "Ingest a video" }), _jsx("p", { className: "text-sm text-eu-slate-500", children: "Paste a TikTok / YouTube Shorts / Instagram / X URL, or pick a pre-cached demo case." })] }), busy && (_jsx("div", { className: "text-xs text-eu-blue animate-pulse", children: "Running pipeline \u00B7 transcribe \u00B7 extract claims \u00B7 match \u00B7 check DSA\u2026" }))] }), _jsxs("form", { onSubmit: (e) => {
                    e.preventDefault();
                    ingest();
                }, className: "flex gap-2", children: [_jsx("input", { type: "url", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://www.tiktok.com/@...", className: "flex-1 px-3 py-2 border border-eu-slate-200 rounded-md text-sm font-mono focus:border-eu-blue focus:outline-none focus:ring-1 focus:ring-eu-blue", disabled: busy }), _jsx("button", { type: "submit", disabled: busy || !url.trim(), className: "px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50 disabled:cursor-not-allowed", children: "Analyse" })] }), error && (_jsx("div", { className: "mt-2 text-xs text-sev-critical bg-sev-critical/5 px-3 py-1.5 rounded", children: error })), demos.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500 mb-1.5", children: "One-click demo cases" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: demos.map((d) => (_jsxs("button", { onClick: () => ingest(d.url), disabled: busy, className: "text-xs px-2 py-1 rounded border border-eu-slate-200 hover:border-eu-blue hover:bg-eu-blue/5 text-eu-slate-700 disabled:opacity-50", title: d.title, children: [d.narrative_hint?.replace(/_/g, " ") ?? d.video_id, " \u00B7 ", d.language.toUpperCase()] }, d.video_id))) })] }))] }));
}
