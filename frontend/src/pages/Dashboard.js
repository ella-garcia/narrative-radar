import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { compactNumber, severityColor } from "../lib/format";
import { IngestBar } from "../components/IngestBar";
import { VideoCard } from "../components/VideoCard";
import { VideoDetailDrawer } from "../components/VideoDetailDrawer";
import { ClusterMap } from "../components/ClusterMap";
export function Dashboard() {
    const [data, setData] = useState(null);
    const [open, setOpen] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const refresh = useCallback(async () => {
        try {
            const d = await api.dashboard();
            setData(d);
            setError(null);
        }
        catch (e) {
            setError(e.message);
        }
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    useEffect(() => {
        if (!data)
            return;
        const hasPending = data.top_threats.some((v) => v.derivative_spread.status === "pending");
        if (!hasPending)
            return;
        const t = window.setInterval(() => {
            refresh();
        }, 4000);
        return () => window.clearInterval(t);
    }, [data, refresh]);
    if (error) {
        return (_jsxs("div", { className: "surface p-6 text-sev-critical", children: ["Backend error: ", error, _jsx("p", { className: "text-eu-slate-500 text-sm mt-2", children: "Make sure the FastAPI backend is running on port 8000." })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Situation overview" }), _jsx("p", { className: "text-sm text-eu-slate-500 mt-0.5", children: "Active short-form video items flagged with potential DSA / AI Act compliance gaps." })] }), _jsx(Link, { to: "/feed", className: "text-sm text-eu-blue hover:underline", children: "Full video feed \u2192" })] }), _jsx(IngestBar, { onIngested: refresh }), data && data.total_videos === 0 ? (_jsxs("div", { className: "surface p-12 text-center", children: [_jsx("h3", { className: "font-serif text-lg text-eu-ink", children: "No videos analysed yet" }), _jsx("p", { className: "text-eu-slate-500 text-sm mt-1", children: "Use the bar above \u2014 pick a one-click demo case to see the pipeline in action." })] })) : data ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsx(Stat, { label: "Items analysed", value: data.total_videos.toString(), tone: "info" }), _jsx(Stat, { label: "High / Critical", value: ((data.by_severity.high ?? 0) +
                                    (data.by_severity.critical ?? 0)).toString(), tone: "high" }), _jsx(Stat, { label: "DSA Art. 34-35 indicators", value: (data.gap_counts_by_article["DSA Art. 34-35"] ?? 0).toString(), sub: "systemic risk \u00B7 platform-admission backed" }), _jsx(Stat, { label: "DSA Art. 26 indicators", value: (data.gap_counts_by_article["DSA Art. 26"] ?? 0).toString(), sub: "coordinated / cross-language spread" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 surface p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-serif text-lg text-eu-ink font-semibold", children: "Narrative cluster map" }), _jsx("span", { className: "text-xs text-eu-slate-500", children: "size = total reach \u00B7 y = max severity \u00B7 x = languages" })] }), _jsx(ClusterMap, { clusters: data.clusters }), data.clusters.length > 0 && (_jsx("div", { className: "mt-3 grid grid-cols-2 md:grid-cols-3 gap-2", children: data.clusters.map((c) => (_jsxs("div", { className: "surface-tight p-2 text-xs", children: [_jsx("div", { className: "font-medium text-eu-ink truncate capitalize", children: c.cluster_id.replace(/_/g, " ") }), _jsxs("div", { className: "text-eu-slate-500 mt-0.5", children: [c.video_ids.length, " videos \u00B7 ", compactNumber(c.total_reach)] }), _jsxs("div", { className: "text-eu-slate-500", children: [c.languages.length, "\u00D7 lang \u00B7", " ", _jsxs("span", { className: severityColor(severityToLabel(c.max_severity)), children: ["sev ", c.max_severity.toFixed(0)] })] })] }, c.cluster_id))) }))] }), _jsxs("div", { className: "surface p-5", children: [_jsx("h2", { className: "font-serif text-lg text-eu-ink font-semibold mb-3", children: "Compliance gap counter" }), _jsxs("ul", { className: "space-y-3", children: [Object.entries(data.gap_counts_by_article).length === 0 && (_jsx("li", { className: "text-sm text-eu-slate-500 italic", children: "No gap indicators yet." })), Object.entries(data.gap_counts_by_article).map(([ref, n]) => (_jsxs("li", { className: "flex items-baseline justify-between border-b border-eu-slate-100 pb-2 last:border-0", children: [_jsx("span", { className: "font-mono text-sm text-eu-ink", children: ref }), _jsx("span", { className: "font-serif text-2xl text-eu-blue tabular-nums", children: n })] }, ref)))] }), _jsx(Link, { to: "/legal", className: "mt-4 inline-block text-xs text-eu-blue hover:underline", children: "Read article texts \u2192" })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-serif text-lg text-eu-ink font-semibold", children: "Top active threats" }), _jsx("button", { onClick: () => navigate("/briefing"), className: "text-sm text-eu-blue hover:underline", children: "Build a briefing from the top items \u2192" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: data.top_threats.map((v) => (_jsx(VideoCard, { video: v, onOpen: () => setOpen(v), onApproved: refresh }, v.metadata.video_id))) })] })] })) : (_jsx("div", { className: "text-eu-slate-500 text-sm", children: "Loading\u2026" })), open && _jsx(VideoDetailDrawer, { video: open, onClose: () => setOpen(null) })] }));
}
function Stat({ label, value, sub, tone, }) {
    return (_jsxs("div", { className: "surface p-4", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: label }), _jsx("div", { className: `metric mt-1 ${tone === "high" ? "text-sev-high" : ""}`, children: value }), sub && _jsx("div", { className: "text-[11px] text-eu-slate-500 mt-1", children: sub })] }));
}
function severityToLabel(s) {
    if (s >= 75)
        return "critical";
    if (s >= 50)
        return "high";
    if (s >= 25)
        return "medium";
    return "low";
}
