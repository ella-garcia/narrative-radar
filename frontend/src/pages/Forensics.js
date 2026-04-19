import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { compactNumber, relativeDate } from "../lib/format";
const CAVEAT = "Investigative signal only. Does not identify a bot, coordinated actor, or legal violation without human review.";
export function Forensics() {
    const [accounts, setAccounts] = useState([]);
    const [selectedHandle, setSelectedHandle] = useState("");
    const [profile, setProfile] = useState(null);
    const [trends, setTrends] = useState([]);
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
        if (!profile)
            return;
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Forensics" }), _jsx("p", { className: "text-sm text-eu-slate-500 mt-0.5", children: "Corpus-based account, narrative, and amplification analysis. Phase 1 uses only videos already analysed by Narrative Radar." })] }), _jsx(Caveat, {}), loading ? (_jsx("div", { className: "text-eu-slate-500 text-sm", children: "Loading forensic corpus\u2026" })) : accounts.length === 0 ? (_jsx(EmptyState, {})) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "surface p-6", children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "section-heading mb-1", children: "Account lens" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "Public handle profile" })] }), _jsxs("label", { className: "flex min-w-64 flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Public handle" }), _jsx("select", { value: selectedHandle, onChange: (e) => setSelectedHandle(e.target.value), className: "select", children: accounts.map((account) => (_jsxs("option", { value: account.handle, children: [account.handle, " \u00B7 ", account.video_count, " video(s)"] }, account.handle))) })] })] }), profile && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsx(Stat, { label: "Analysed videos", value: profile.summary.video_count.toString() }), _jsx(Stat, { label: "Corpus reach", value: compactNumber(profile.summary.total_reach) }), _jsx(Stat, { label: "Languages", value: profile.summary.languages.join(", ").toUpperCase() || "n/a" }), _jsx(Stat, { label: "Clusters", value: profile.summary.known_clusters.length.toString() })] }), _jsxs("div", { className: "grid gap-5 lg:grid-cols-2", children: [_jsx(Panel, { title: "Observed account summary", children: _jsxs("dl", { className: "grid grid-cols-[9rem_1fr] gap-y-2 text-sm", children: [_jsx("dt", { className: "text-eu-slate-500", children: "Platforms" }), _jsx("dd", { children: profile.summary.platforms.join(", ") }), _jsx("dt", { className: "text-eu-slate-500", children: "First upload" }), _jsx("dd", { children: profile.summary.first_observed_upload ? relativeDate(profile.summary.first_observed_upload) : "n/a" }), _jsx("dt", { className: "text-eu-slate-500", children: "Last upload" }), _jsx("dd", { children: profile.summary.last_observed_upload ? relativeDate(profile.summary.last_observed_upload) : "n/a" }), _jsx("dt", { className: "text-eu-slate-500", children: "Engagement" }), _jsxs("dd", { children: ["median ", compactNumber(profile.engagement_stats.median_views ?? 0), " \u00B7 max", " ", compactNumber(profile.engagement_stats.max_views ?? 0)] })] }) }), _jsx(Panel, { title: "Posting cadence", children: _jsx(MiniBars, { values: profile.posting_cadence, empty: "No cadence data yet." }) }), _jsx(Panel, { title: "Hashtags", children: _jsx(ChipCounts, { values: profile.hashtag_counts, empty: "No hashtags in analysed videos." }) }), _jsx(Panel, { title: "Narrative clusters", children: _jsx(ChipCounts, { values: profile.narrative_clusters, empty: "No cluster assignments yet." }) })] }), _jsxs("section", { children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-end justify-between gap-4 border-t border-eu-slate-100 pt-5", children: [_jsxs("div", { children: [_jsx("div", { className: "section-heading", children: "Signals" }), _jsx("h3", { className: "font-serif text-lg font-semibold text-eu-ink", children: "Descriptive forensic indicators" })] }), _jsx("button", { type: "button", onClick: copyForensicContext, className: "text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50", children: copied ? "Copied" : "Copy forensic context" })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: profile.signals.map((signal) => (_jsx(SignalCard, { signal: signal }, `${signal.signal_type}-${signal.title}`))) })] }), profile.missing_data_notes.length > 0 && (_jsx(Panel, { title: "Missing data notes", children: _jsx("ul", { className: "space-y-1.5 text-sm text-eu-slate-600", children: profile.missing_data_notes.map((note) => (_jsxs("li", { children: ["\u2022 ", note] }, note))) }) }))] }))] }), _jsxs("section", { className: "surface p-5", children: [_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "section-heading", children: "Narrative trends" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "Stored-corpus trend points" })] }), _jsx(Caveat, { compact: true }), topTrends.length === 0 ? (_jsx("div", { className: "surface-tight p-4 text-sm text-eu-slate-500", children: "No trend data yet." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Date" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Cluster" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Language" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Hashtag" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Videos" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Reach" })] }) }), _jsx("tbody", { children: topTrends.map((trend) => (_jsxs("tr", { className: "border-t border-eu-slate-100", children: [_jsx("td", { className: "px-3 py-2", children: trend.date_bucket }), _jsx("td", { className: "px-3 py-2 capitalize", children: (trend.cluster_id ?? "unclustered").replace(/_/g, " ") }), _jsx("td", { className: "px-3 py-2", children: trend.language?.toUpperCase() ?? "n/a" }), _jsx("td", { className: "px-3 py-2", children: trend.hashtag ?? "n/a" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: trend.video_count }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: compactNumber(trend.total_reach) })] }, `${trend.date_bucket}-${trend.cluster_id}-${trend.language}-${trend.hashtag}`))) })] }) }))] }), _jsxs("section", { className: "surface p-5", children: [_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "section-heading", children: "Amplification signals" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "Shared audio and same-window cluster links" })] }), _jsx(Caveat, { compact: true }), _jsx(AmplificationTable, { edges: allEdges })] })] }))] }));
}
function Caveat({ compact = false }) {
    return (_jsx("div", { className: `rounded-md border border-amber-200 bg-amber-50 text-amber-950 ${compact ? "mb-3 p-3 text-xs" : "p-4 text-sm"}`, children: CAVEAT }));
}
function EmptyState() {
    return (_jsxs("div", { className: "surface p-12 text-center", children: [_jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "No forensic corpus yet" }), _jsx("p", { className: "mx-auto mt-2 max-w-xl text-sm text-eu-slate-500", children: "Ingest or analyze videos first. The Forensics tab only reads the existing analysed-video store and does not start scraping, monitoring, or external provider calls." })] }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { className: "surface-tight min-h-24 p-5", children: [_jsx("div", { className: "section-heading mb-2", children: label }), _jsx("div", { className: "metric text-2xl", children: value || "n/a" })] }));
}
function Panel({ title, children }) {
    return (_jsxs("section", { className: "surface-tight min-h-28 p-5", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-eu-ink", children: title }), children] }));
}
function ChipCounts({ values, empty, }) {
    const entries = Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (!entries.length)
        return _jsx("p", { className: "text-sm text-eu-slate-500", children: empty });
    return (_jsx("div", { className: "flex flex-wrap gap-2", children: entries.map(([label, count]) => (_jsxs("span", { className: "chip px-2.5 py-1", children: [label.replace(/_/g, " "), " \u00B7 ", count] }, label))) }));
}
function MiniBars({ values, empty, }) {
    const entries = Object.entries(values);
    const max = Math.max(1, ...entries.map(([, value]) => value));
    if (!entries.length)
        return _jsx("p", { className: "text-sm text-eu-slate-500", children: empty });
    return (_jsx("div", { className: "space-y-2", children: entries.map(([label, value]) => (_jsxs("div", { className: "grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-xs", children: [_jsx("span", { className: "font-mono text-eu-slate-500", children: label }), _jsx("div", { className: "h-2 rounded bg-eu-slate-100", children: _jsx("div", { className: "h-2 rounded bg-eu-blue", style: { width: `${Math.max(8, (value / max) * 100)}%` } }) }), _jsx("span", { className: "text-right tabular-nums text-eu-slate-600", children: value })] }, label))) }));
}
function SignalCard({ signal }) {
    const tone = signal.severity === "high"
        ? "border-sev-critical/30 bg-sev-critical/5"
        : signal.severity === "medium"
            ? "border-sev-medium/30 bg-sev-medium/5"
            : "border-eu-slate-200 bg-white";
    return (_jsxs("article", { className: `surface-tight p-4 ${tone}`, children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "chip", children: signal.signal_type.replace(/_/g, " ") }), _jsx("span", { className: "badge bg-eu-slate-100 text-eu-slate-700 border border-eu-slate-200", children: signal.severity })] }), _jsx("h4", { className: "text-sm font-semibold text-eu-ink", children: signal.title }), _jsx("p", { className: "mt-1 text-sm leading-6 text-eu-slate-600", children: signal.description }), _jsx("p", { className: "mt-3 text-[11px] italic text-eu-slate-500", children: signal.caveat })] }));
}
function AmplificationTable({ edges }) {
    if (!edges.length) {
        return (_jsx("div", { className: "surface-tight p-4 text-sm text-eu-slate-500", children: "No amplification edges for the selected account yet." }));
    }
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Source" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Related" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Relation" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Evidence" })] }) }), _jsx("tbody", { children: edges.slice(0, 20).map((edge, index) => (_jsxs("tr", { className: "border-t border-eu-slate-100", children: [_jsx("td", { className: "px-3 py-2", children: edge.source_handle }), _jsx("td", { className: "px-3 py-2", children: edge.related_handle }), _jsx("td", { className: "px-3 py-2", children: edge.relation_type.replace(/_/g, " ") }), _jsx("td", { className: "px-3 py-2 font-mono text-xs text-eu-slate-500", children: Object.entries(edge.shared_evidence)
                                    .map(([key, value]) => `${key}: ${String(value)}`)
                                    .join(" · ") })] }, `${edge.source_handle}-${edge.related_handle}-${edge.relation_type}-${index}`))) })] }) }));
}
