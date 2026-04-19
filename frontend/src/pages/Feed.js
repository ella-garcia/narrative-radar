import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
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
    const [videos, setVideos] = useState([]);
    const [open, setOpen] = useState(null);
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
        if (!videos.some((v) => v.derivative_spread.status === "pending"))
            return;
        const t = window.setInterval(() => {
            refresh();
        }, 4000);
        return () => window.clearInterval(t);
    }, [videos, refresh]);
    const languages = useMemo(() => {
        const all = new Set();
        videos.forEach((v) => all.add(v.metadata.language));
        return Array.from(all).sort();
    }, [videos]);
    function updateVideo(updated) {
        setVideos((current) => current.map((v) => v.metadata.video_id === updated.metadata.video_id ? updated : v));
        setOpen((current) => current?.metadata.video_id === updated.metadata.video_id ? updated : current);
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Video feed" }), _jsx("p", { className: "text-sm text-eu-slate-500 mt-0.5", children: "All ingested items, sorted by severity. Click any card for full evidence." })] }), _jsx(IngestBar, { onIngested: refresh, constituency: constituency || undefined }), _jsxs("div", { className: "surface p-4 flex flex-wrap items-end gap-3", children: [_jsx(Field, { label: "Constituency banner", children: _jsx("select", { value: constituency, onChange: (e) => setConstituency(e.target.value), className: "select", children: CONSTITUENCIES.map((c) => (_jsx("option", { value: c, children: c ? `${flag(c)} ${c}` : "All constituencies" }, c || "all"))) }) }), _jsx(Field, { label: "Severity", children: _jsx("select", { value: severity, onChange: (e) => setSeverity(e.target.value), className: "select", children: SEVERITIES.map((s) => (_jsx("option", { value: s.value, children: s.label }, s.value))) }) }), _jsx(Field, { label: "Language", children: _jsxs("select", { value: language, onChange: (e) => setLanguage(e.target.value), className: "select", children: [_jsx("option", { value: "", children: "All languages" }), languages.map((l) => (_jsxs("option", { value: l, children: [flag(l), " ", l.toUpperCase()] }, l)))] }) }), _jsx(Field, { label: "Gap type", children: _jsx("select", { value: article, onChange: (e) => setArticle(e.target.value), className: "select", children: ARTICLES.map((a) => (_jsx("option", { value: a.value, children: a.label }, a.value))) }) }), _jsx("button", { onClick: () => {
                            setSeverity("");
                            setLanguage("");
                            setArticle("");
                            setConstituency("");
                        }, className: "text-xs text-eu-blue hover:underline ml-auto", children: "Clear filters" })] }), constituency && (_jsxs("div", { className: "surface-tight px-4 py-3 bg-eu-blue/5 border-eu-blue/20 text-sm text-eu-ink", children: [flag(constituency), " Showing items relevant to ", _jsx("strong", { children: constituency }), " ", "parliamentary office. Constituency banner attaches to any briefing you generate."] })), videos.length === 0 ? (_jsx("div", { className: "surface p-12 text-center text-eu-slate-500 text-sm", children: "No items match these filters yet." })) : (_jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: videos.map((v) => (_jsx(VideoCard, { video: v, onOpen: () => setOpen(v) }, v.metadata.video_id))) })), open && (_jsx(VideoDetailDrawer, { video: open, onClose: () => setOpen(null), onReviewUpdated: updateVideo }))] }));
}
function Field({ label, children }) {
    return (_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: label }), children] }));
}
