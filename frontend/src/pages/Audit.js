import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getIdentity, setIdentity } from "../lib/api";
import { relativeDate } from "../lib/format";
const ACTION_PALETTE = {
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
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
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
        }
        catch (e) {
            setError(e.message);
            setData(null);
        }
    }, [actionFilter, actorFilter]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    const grouped = useMemo(() => {
        if (!data)
            return [];
        const days = [];
        let current = null;
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Audit log" }), _jsxs("p", { className: "text-sm text-eu-slate-500 mt-0.5", children: ["Tamper-evident, append-only record of every state-changing operation.", " ", _jsx("span", { className: "italic", children: "DPO view \u2014 gated by role." })] })] }), _jsx("button", { onClick: refresh, className: "text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50", children: "Refresh" })] }), _jsxs("div", { className: "surface p-4", children: [_jsx("div", { className: "section-heading mb-2", children: "Acting as (sent on every state-changing API call)" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Actor" }), _jsx("input", { value: identity.actor, onChange: (e) => setIdent({ ...identity, actor: e.target.value }), onBlur: () => setIdentity(identity), className: "select" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Role" }), _jsxs("select", { value: identity.role, onChange: (e) => {
                                            const next = { ...identity, role: e.target.value };
                                            setIdent(next);
                                            setIdentity(next);
                                        }, className: "select", children: [_jsx("option", { value: "aide", children: "aide" }), _jsx("option", { value: "mp", children: "mp" }), _jsx("option", { value: "dpo", children: "dpo" })] })] }), _jsxs("div", { className: "text-xs text-eu-slate-500 italic flex items-end pb-1", children: ["Production replaces this with the institution's SSO + RBAC. The DPO view is always queryable here regardless \u2014 see", " ", _jsx("code", { className: "font-mono ml-1", children: "main.py: _require_dpo()" }), "."] })] })] }), error && (_jsx("div", { className: "surface p-4 text-sev-critical text-sm", children: error })), data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsx(Stat, { label: "Total events", value: data.chain.total_records.toString() }), _jsx(Stat, { label: "Chain integrity", value: data.chain.intact ? "Intact" : "Tampered", tone: data.chain.intact ? "good" : "bad", sub: data.chain.intact
                                    ? "SHA-256 chain verifies cleanly"
                                    : `Breaks at: ${data.chain.broken_indices.join(", ")}` }), _jsx(Stat, { label: "Showing", value: `${data.count_returned} / ${data.count_total}` }), _jsx(Stat, { label: "Head hash", value: _jsx("span", { className: "font-mono text-sm break-all", children: data.chain.head_hash }) })] }), _jsxs("div", { className: "surface p-4 flex flex-wrap items-end gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Action" }), _jsx("select", { value: actionFilter, onChange: (e) => setActionFilter(e.target.value), className: "select", children: ACTIONS.map((a) => (_jsx("option", { value: a.value, children: a.label }, a.value))) })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Actor (substring)" }), _jsx("input", { value: actorFilter, onChange: (e) => setActorFilter(e.target.value), placeholder: "e.g. alice@parl", className: "select" })] }), _jsx("button", { onClick: () => {
                                    setActionFilter("");
                                    setActorFilter("");
                                }, className: "text-xs text-eu-blue hover:underline ml-auto", children: "Clear" })] }), data.records.length === 0 ? (_jsx("div", { className: "surface p-12 text-center text-sm text-eu-slate-500", children: "No events match these filters." })) : (_jsx("div", { className: "surface overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-eu-slate-50 text-[10px] uppercase tracking-wider text-eu-slate-500", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-3 py-2 font-semibold", children: "When" }), _jsx("th", { className: "text-left px-3 py-2 font-semibold", children: "Actor" }), _jsx("th", { className: "text-left px-3 py-2 font-semibold", children: "Role" }), _jsx("th", { className: "text-left px-3 py-2 font-semibold", children: "Action" }), _jsx("th", { className: "text-left px-3 py-2 font-semibold", children: "Detail" }), _jsx("th", { className: "text-left px-3 py-2 font-semibold", children: "Hash" })] }) }), _jsx("tbody", { children: grouped.map((g) => (_jsxs(_Fragment, { children: [_jsx("tr", { className: "bg-eu-slate-50/60", children: _jsx("td", { colSpan: 6, className: "px-3 py-1.5 text-[11px] uppercase tracking-wider text-eu-slate-500 font-semibold", children: g.day }) }, `day-${g.day}`), g.records.map((r) => (_jsxs("tr", { className: "border-t border-eu-slate-100 hover:bg-eu-slate-50/40", children: [_jsxs("td", { className: "px-3 py-2 align-top", children: [_jsx("div", { className: "text-xs text-eu-slate-600", children: r.timestamp.slice(11, 19) }), _jsx("div", { className: "text-[10px] text-eu-slate-400", children: relativeDate(r.timestamp) })] }), _jsx("td", { className: "px-3 py-2 align-top text-xs font-mono", children: r.actor }), _jsx("td", { className: "px-3 py-2 align-top", children: _jsx("span", { className: "chip", children: r.role }) }), _jsx("td", { className: "px-3 py-2 align-top", children: _jsx("span", { className: `badge border ${ACTION_PALETTE[r.action] ?? ACTION_PALETTE.default} font-mono`, children: r.action }) }), _jsx("td", { className: "px-3 py-2 align-top", children: _jsx(DetailCell, { detail: r.detail }) }), _jsx("td", { className: "px-3 py-2 align-top text-[10px] font-mono text-eu-slate-500 break-all max-w-[140px]", children: r.entry_hash })] }, r.entry_hash)))] }))) })] }) }))] }))] }));
}
function Stat({ label, value, sub, tone, }) {
    return (_jsxs("div", { className: "surface p-4", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: label }), _jsx("div", { className: `metric mt-1 ${tone === "good" ? "text-sev-low" : tone === "bad" ? "text-sev-critical" : ""}`, children: value }), sub && _jsx("div", { className: "text-[11px] text-eu-slate-500 mt-1", children: sub })] }));
}
function DetailCell({ detail }) {
    if (!detail || Object.keys(detail).length === 0) {
        return _jsx("span", { className: "text-eu-slate-400 italic text-xs", children: "\u2014" });
    }
    // Promote the most relevant fields inline; everything else under a disclosure.
    const inline = [];
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
        if (detail[k] === undefined || detail[k] === null)
            continue;
        const v = Array.isArray(detail[k]) ? detail[k].join(", ") : String(detail[k]);
        inline.push({ k, v });
    }
    return (_jsxs("div", { className: "text-xs", children: [_jsx("ul", { className: "space-y-0.5", children: inline.slice(0, 4).map(({ k, v }) => (_jsxs("li", { className: "flex gap-2", children: [_jsxs("span", { className: "text-eu-slate-500 shrink-0", children: [k, ":"] }), _jsx("span", { className: "font-mono break-all text-eu-slate-700 truncate", title: v, children: v.length > 80 ? v.slice(0, 80) + "…" : v })] }, k))) }), Object.keys(detail).length > 4 && (_jsxs("details", { className: "mt-1", children: [_jsx("summary", { className: "cursor-pointer text-[10px] text-eu-slate-500 hover:text-eu-blue", children: "full payload" }), _jsx("pre", { className: "text-[10px] mt-1 bg-eu-slate-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words", children: JSON.stringify(detail, null, 2) })] }))] }));
}
