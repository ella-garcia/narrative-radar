import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { compactNumber, flag } from "../lib/format";
export function Briefing() {
    const [params] = useSearchParams();
    const initialIds = (params.get("video") ?? "").split(",").filter(Boolean);
    const [videos, setVideos] = useState([]);
    const [selected, setSelected] = useState(new Set(initialIds));
    const [briefing, setBriefing] = useState(null);
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
        }
        finally {
            setLoading(false);
        }
    }
    function printDoc() {
        window.print();
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Parliamentary briefing" }), _jsx("p", { className: "text-sm text-eu-slate-500 mt-0.5", children: "Two-page factual briefing citing specific DSA / AI Act articles, ready for printing or download." })] }), _jsxs("div", { className: "surface p-5 print:hidden", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Requester" }), _jsx("input", { value: requester, onChange: (e) => setRequester(e.target.value), className: "select" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: "Constituency" }), _jsx("select", { value: constituency, onChange: (e) => setConstituency(e.target.value), className: "select", children: ["RO", "DE", "FR", "PL", "IT", "ES", "NL", "SK", ""].map((c) => (_jsx("option", { value: c, children: c ? `${flag(c)} ${c}` : "All / cross-border" }, c || "all"))) })] }), _jsx("div", { className: "flex items-end", children: _jsx("button", { onClick: generate, disabled: loading, className: "px-4 py-2 rounded-md bg-eu-blue text-white text-sm font-medium hover:bg-eu-blue/90 disabled:opacity-50 w-full md:w-auto", children: loading ? "Generating…" : "Generate briefing" }) })] }), _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "section-heading mb-2", children: ["Items to include ", selected.size > 0 ? `(${selected.size} selected)` : "(top 5 if none selected)"] }), _jsx("div", { className: "space-y-1.5 max-h-56 overflow-y-auto", children: videos.map((v) => (_jsxs("label", { className: "flex items-center gap-3 px-2 py-1 rounded hover:bg-eu-slate-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selected.has(v.metadata.video_id), onChange: (e) => {
                                                const s = new Set(selected);
                                                if (e.target.checked)
                                                    s.add(v.metadata.video_id);
                                                else
                                                    s.delete(v.metadata.video_id);
                                                setSelected(s);
                                            } }), _jsxs("span", { className: "font-mono text-xs text-eu-slate-500 w-16 shrink-0", children: ["sev ", v.severity.score.toFixed(0)] }), _jsx("span", { className: "text-sm truncate", children: v.metadata.title }), _jsxs("span", { className: "text-xs text-eu-slate-500 ml-auto", children: [flag(v.metadata.language), " \u00B7 ", compactNumber(v.metadata.view_count)] })] }, v.metadata.video_id))) })] })] }), briefing && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-end gap-2 print:hidden", children: [_jsx("button", { onClick: () => navigator.clipboard.writeText(JSON.stringify(briefing, null, 2)), className: "text-xs px-3 py-1.5 border border-eu-slate-200 rounded-md hover:bg-eu-slate-50", children: "Copy JSON" }), _jsx("button", { onClick: printDoc, className: "text-xs px-3 py-1.5 bg-eu-blue text-white rounded-md hover:bg-eu-blue/90", children: "Print / Save PDF" })] }), _jsx(BriefingDocument, { briefing: briefing })] }))] }));
}
function BriefingDocument({ briefing }) {
    const issued = new Date(briefing.issued_at);
    const hash = briefing.briefing_hash ?? "";
    return (_jsxs("article", { className: "briefing-doc bg-white shadow-card border border-eu-slate-200 rounded-lg max-w-[820px] mx-auto print:shadow-none print:border-0 print:rounded-none print:max-w-none", children: [_jsxs("div", { className: "briefing-footer hidden print:flex", children: [_jsx("span", { children: "Narrative Radar \u00B7 v0.1 \u00B7 indicator output, not a legal determination" }), _jsx("span", { className: "font-mono", children: hash })] }), _jsx("div", { className: "briefing-banner px-10 py-6 border-b-4 border-eu-gold bg-eu-blue text-white", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase tracking-[0.25em] opacity-80", children: "Narrative Radar \u2014 Parliamentary Compliance Briefing" }), _jsx("h2", { className: "font-serif text-2xl mt-1", children: briefing.title })] }), _jsxs("div", { className: "text-right text-[11px] opacity-90", children: [_jsxs("div", { children: ["Issued ", issued.toUTCString().replace(":00 GMT", " GMT")] }), _jsxs("div", { children: ["For: ", briefing.requester] }), briefing.constituency && _jsxs("div", { children: ["Constituency: ", briefing.constituency] })] })] }) }), _jsxs("div", { className: "briefing-body px-10 py-6 font-serif text-eu-ink leading-relaxed", children: [_jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "Executive summary", children: _jsx("p", { children: briefing.executive_summary }) }) }), _jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "Findings", children: _jsx("ol", { className: "list-decimal pl-5 space-y-1.5", children: briefing.findings.map((f, i) => (_jsx("li", { children: f }, i))) }) }) }), _jsx("div", { className: "briefing-section", children: _jsx(Section, { title: "Cited articles", children: _jsx("div", { className: "space-y-3", children: briefing.cited_articles.map((a) => (_jsxs("div", { className: "briefing-article border-l-4 border-eu-blue/40 pl-3", children: [_jsxs("div", { className: "font-sans font-semibold text-sm", children: [a.ref, a.short && (_jsxs("span", { className: "font-normal text-eu-slate-500", children: [" \u2014 ", a.short] }))] }), a.summary && (_jsx("p", { className: "text-sm text-eu-slate-700 mt-0.5", children: a.summary })), a.indicator_basis && (_jsxs("p", { className: "text-xs text-eu-slate-500 mt-1 italic", children: ["Indicator basis: ", a.indicator_basis] })), _jsxs("div", { className: "text-[11px] font-mono text-eu-slate-500 mt-1", children: [a.instrument, " \u00B7 ", _jsx("a", { href: a.official_url, target: "_blank", rel: "noreferrer", className: "underline", children: "official text" }), a.enforcement_date && ` · enforceable ${a.enforcement_date}`] })] }, a.ref))) }) }) }), _jsx("div", { className: "briefing-section briefing-evidence", children: _jsx(Section, { title: "Evidence pack", children: _jsx("div", { className: "space-y-4", children: briefing.evidence.map((e) => (_jsxs("div", { className: "briefing-evidence-item surface-tight font-sans p-4 text-sm", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2 mb-1", children: [_jsx("div", { className: "font-semibold text-eu-ink", children: e.title }), _jsxs("div", { className: "text-xs text-eu-slate-500", children: [flag(e.language), " ", e.platform, " \u00B7 ", compactNumber(e.reach), " views"] })] }), _jsxs("div", { className: "text-xs text-eu-slate-500 mb-2", children: [e.author, " \u00B7 ", _jsx("a", { href: e.url, target: "_blank", rel: "noreferrer", className: "text-eu-blue underline break-all", children: e.url })] }), e.transcript_excerpt && (_jsx("blockquote", { className: "border-l-2 border-eu-slate-200 pl-3 text-xs text-eu-slate-600 italic mt-1", children: e.transcript_excerpt })), e.edmo_matches?.length > 0 && (_jsxs("div", { className: "text-xs mt-2", children: [_jsx("span", { className: "font-semibold", children: "Matched fact-checks:" }), " ", e.edmo_matches.map((m) => (_jsxs("a", { href: m.source_url, target: "_blank", rel: "noreferrer", className: "text-eu-blue underline mr-2", children: [m.source, " (", m.similarity.toFixed(2), ")"] }, m.title)))] })), e.dsa_tdb_cross_refs?.length > 0 && (_jsxs("div", { className: "text-xs mt-1", children: [_jsx("span", { className: "font-semibold", children: "DSA TDB:" }), " ", e.dsa_tdb_cross_refs.map((c) => (_jsxs("span", { className: "mr-2", children: [c.actions_taken.toLocaleString(), " \u00D7 ", c.decision_ground] }, c.decision_ground)))] })), e.gaps?.length > 0 && (_jsxs("div", { className: "text-xs mt-1", children: [_jsx("span", { className: "font-semibold", children: "Indicators:" }), " ", e.gaps.map((g) => (_jsxs("span", { className: "mr-2 font-mono", children: [g.article_ref, " (", g.severity, ")"] }, g.article_ref)))] })), e.derivative_spread_radius && (_jsxs("div", { className: "text-xs mt-2 text-eu-slate-700", children: [_jsx("span", { className: "font-semibold", children: "Derivative Spread Radius:" }), " ", e.derivative_spread_radius.derivative_count, " subsequent videos \u00B7", " ", compactNumber(e.derivative_spread_radius.aggregate_reach), " aggregate reach \u00B7", " ", "root proof ", e.derivative_spread_radius.root_proof_status] }))] }, e.video_id))) }) }) }), _jsx("div", { className: "briefing-section mt-8 pt-4 border-t border-eu-slate-200 text-[11px] text-eu-slate-500 italic", children: briefing.disclaimer }), _jsxs("div", { className: "text-[10px] text-eu-slate-400 mt-2 font-mono flex flex-wrap gap-x-3 gap-y-1", children: [_jsx("span", { children: "Generated by Narrative Radar v0.1" }), _jsxs("span", { children: ["\u00B7 ", issued.toISOString()] }), hash && _jsxs("span", { children: ["\u00B7 ", hash] })] })] })] }));
}
function Section({ title, children }) {
    return (_jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "font-sans text-[11px] uppercase tracking-[0.2em] text-eu-blue font-semibold mb-2", children: title }), children] }));
}
