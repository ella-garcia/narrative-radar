import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { compactNumber, flag, platformLabel, relativeDate } from "../lib/format";
import { SeverityMeter } from "./SeverityMeter";
import { ViolationBadge } from "./ViolationBadge";
const CATEGORY_PALETTE = {
    election: "bg-purple-100 text-purple-800",
    government: "bg-blue-100 text-blue-800",
    military: "bg-red-100 text-red-800",
    health: "bg-emerald-100 text-emerald-800",
    eu_institutions: "bg-amber-100 text-amber-800",
    migration: "bg-orange-100 text-orange-800",
    climate: "bg-green-100 text-green-800",
    other: "bg-eu-slate-100 text-eu-slate-700",
};
export function VideoDetailDrawer({ video, onClose, onReviewUpdated, }) {
    const [liveVideo, setLiveVideo] = useState(video);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    useEffect(() => {
        setLiveVideo(video);
        setIsFullScreen(false);
    }, [video]);
    useEffect(() => {
        function esc(e) {
            if (e.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", esc);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", esc);
            document.body.style.overflow = "";
        };
    }, [onClose]);
    useEffect(() => {
        if (liveVideo.derivative_spread.status !== "pending")
            return;
        let cancelled = false;
        const t = window.setInterval(async () => {
            try {
                const fresh = await api.getVideo(liveVideo.metadata.video_id);
                if (!cancelled)
                    setLiveVideo(fresh);
            }
            catch {
                // Ignore transient polling failures in the drawer.
            }
        }, 3000);
        return () => {
            cancelled = true;
            window.clearInterval(t);
        };
    }, [liveVideo.derivative_spread.status, liveVideo.metadata.video_id]);
    const m = liveVideo.metadata;
    const synth = liveVideo.synthetic_media_likelihood;
    const lowConf = liveVideo.transcript.confidence !== "high";
    const approved = liveVideo.human_review.status === "approved";
    const sentForAdditionalReview = liveVideo.human_review.status === "additional_review";
    const crossPlatformReach = liveVideo.derivative_spread.status === "complete"
        ? liveVideo.derivative_spread.aggregate_reach
        : 0;
    const combinedReach = m.view_count + crossPlatformReach;
    async function updateReviewStatus(nextStatus) {
        setIsReviewing(true);
        try {
            const updated = nextStatus === "approved"
                ? await api.approveVideo(m.video_id)
                : await api.sendForAdditionalReview(m.video_id);
            setLiveVideo(updated);
            onReviewUpdated?.(updated);
        }
        finally {
            setIsReviewing(false);
        }
    }
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6", children: [_jsx("button", { type: "button", "aria-label": "Close video details", className: "fixed inset-0 h-screen w-screen cursor-default bg-eu-ink/45", onClick: onClose }), _jsxs("aside", { "aria-modal": "true", role: "dialog", className: `relative flex flex-col overflow-hidden bg-eu-slate-50 shadow-2xl ${isFullScreen
                    ? "h-screen w-screen rounded-none"
                    : "max-h-[calc(100vh-2rem)] w-[min(911px,calc(100vw-2rem))] rounded-lg"}`, children: [_jsxs("div", { className: "shrink-0 bg-white border-b border-eu-slate-200 px-6 py-4 z-10", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5 mb-1", children: [_jsx("span", { className: "chip", children: platformLabel(m.platform) }), _jsxs("span", { className: "chip", children: [flag(m.language), " ", m.language.toUpperCase()] }), liveVideo.cluster_id && (_jsx("span", { className: "chip bg-eu-blue/5 text-eu-blue", children: liveVideo.cluster_id.replace(/_/g, " ") }))] }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink truncate", children: m.title }), _jsxs("div", { className: "text-sm text-eu-slate-500 mt-0.5", children: [m.author, " \u00B7 ", compactNumber(m.view_count), " views \u00B7 ", relativeDate(m.upload_date)] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => setIsFullScreen((current) => !current), "aria-label": isFullScreen ? "Exit full screen preview" : "Expand to full screen", title: isFullScreen ? "Exit full screen" : "Full screen", className: "grid h-8 w-8 place-items-center rounded text-eu-slate-500 hover:bg-eu-slate-100 hover:text-eu-ink", children: isFullScreen ? "↙" : "↗" }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Close video details", className: "grid h-8 w-8 place-items-center rounded text-eu-slate-500 hover:bg-eu-slate-100 hover:text-eu-ink", children: "\u2715" })] })] }), _jsx("div", { className: "mt-3", children: _jsx(SeverityMeter, { score: liveVideo.severity.score, label: liveVideo.severity.label, details: liveVideo.severity }) }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: `badge border ${approved
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                            : sentForAdditionalReview
                                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                                : "bg-amber-100 text-amber-800 border-amber-200"}`, children: approved
                                            ? "Approved"
                                            : sentForAdditionalReview
                                                ? "Sent for Additional Review"
                                                : "Human Review Pending" }), approved && liveVideo.human_review.approved_by && (_jsxs("span", { className: "text-xs text-eu-slate-500", children: ["by ", liveVideo.human_review.approved_by] }))] })] }), _jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto", children: [lowConf && (_jsxs("div", { className: "mx-6 mt-4 surface-tight bg-amber-50 border-amber-200 px-4 py-3 text-sm text-amber-900", children: ["\u26A0 ", _jsx("strong", { children: "Human review required." }), " ", liveVideo.transcript.low_confidence_warning ??
                                        `ASR + LLM confidence is ${liveVideo.transcript.confidence}.`] })), _jsx(Section, { title: "Compliance gap indicators", children: liveVideo.compliance_gaps.length === 0 ? (_jsx("p", { className: "text-sm text-eu-slate-500", children: "No gap indicators above threshold for this item." })) : (_jsx("div", { className: "space-y-3", children: liveVideo.compliance_gaps.map((g) => (_jsxs("div", { className: "surface-tight p-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-2", children: [_jsx(ViolationBadge, { articleRef: g.article_ref, severity: g.severity }), _jsx("span", { className: "text-xs text-eu-slate-500", children: g.article_short })] }), _jsx("p", { className: "text-sm text-eu-slate-700", children: g.description }), _jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "text-xs text-eu-slate-500 cursor-pointer hover:text-eu-blue", children: "Evidence detail" }), _jsx("pre", { className: "text-[11px] mt-2 bg-eu-slate-50 p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap break-words", children: JSON.stringify(g.evidence, null, 2) })] }), _jsx("p", { className: "text-[11px] text-eu-slate-400 italic mt-2", children: g.disclaimer })] }, g.article_ref))) })) }), _jsx(Section, { title: "Derivative spread radius", children: liveVideo.derivative_spread.status === "not_applicable" ? (_jsx("p", { className: "text-sm text-eu-slate-500", children: "No lineage enrichment was scheduled for this item." })) : liveVideo.derivative_spread.status === "pending" ? (_jsx("p", { className: "text-sm text-eu-blue", children: "Lineage enrichment is still running. This drawer refreshes automatically." })) : liveVideo.derivative_spread.status === "failed" ? (_jsxs("p", { className: "text-sm text-sev-medium", children: ["Lineage enrichment failed. ", liveVideo.derivative_spread.error ?? "No further detail available."] })) : (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "surface-tight p-4 text-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3 text-eu-slate-700", children: [_jsxs("span", { children: [_jsx("strong", { children: liveVideo.derivative_spread.derivative_count }), " derivative videos"] }), _jsxs("span", { children: [_jsx("strong", { children: compactNumber(liveVideo.derivative_spread.aggregate_reach) }), " aggregate reach"] }), _jsxs("span", { children: ["root proof: ", _jsx("strong", { children: liveVideo.derivative_spread.root_proof_status })] })] }), crossPlatformReach > 0 && (_jsxs("div", { className: "mt-4 grid gap-2 border-t border-eu-slate-100 pt-3 sm:grid-cols-3", children: [_jsx(ReachMetric, { label: "Native video reach", value: m.view_count }), _jsx(ReachMetric, { label: "Cross-platform spread", value: crossPlatformReach }), _jsx(ReachMetric, { label: "Combined reach", value: combinedReach, emphasized: true })] })), liveVideo.derivative_spread.audio_id && (_jsxs("div", { className: "mt-2 text-xs text-eu-slate-500 font-mono", children: ["audio_id ", liveVideo.derivative_spread.audio_id] }))] }), liveVideo.derivative_spread.sample_videos.length > 0 && (_jsx("div", { className: "space-y-2", children: liveVideo.derivative_spread.sample_videos.slice(0, 6).map((child) => (_jsxs("div", { className: "surface-tight p-3 text-sm", children: [_jsx("div", { className: "font-medium text-eu-ink", children: child.title || child.video_id }), _jsxs("div", { className: "text-xs text-eu-slate-500 mt-1", children: [child.author, " ", child.language ? `· ${flag(child.language)} ${child.language.toUpperCase()}` : "", " \u00B7 ", compactNumber(child.view_count), " views"] })] }, child.video_id))) }))] })) }), _jsx(Section, { title: "Extracted claims", children: _jsx("div", { className: "space-y-2", children: liveVideo.claims.map((c, i) => (_jsxs("div", { className: "surface-tight p-3 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: `badge ${CATEGORY_PALETTE[c.category] ?? CATEGORY_PALETTE.other}`, children: c.category }), c.start_sec != null && (_jsxs("span", { className: "text-[11px] text-eu-slate-500 font-mono", children: [c.start_sec.toFixed(0), "s", c.speaker ? ` · ${c.speaker}` : ""] }))] }), _jsx("p", { className: "text-eu-slate-700", children: c.text })] }, i))) }) }), _jsx(Section, { title: "OCR text", children: liveVideo.ocr_result.blocks.length === 0 ? (_jsxs("p", { className: "text-sm text-eu-slate-500", children: ["OCR status: ", liveVideo.ocr_result.status, liveVideo.ocr_result.error ? ` · ${liveVideo.ocr_result.error}` : ""] })) : (_jsx("div", { className: "space-y-2", children: liveVideo.ocr_result.blocks.map((b, i) => (_jsxs("div", { className: "surface-tight p-3 text-sm", children: [_jsx("div", { className: "text-eu-ink", children: b.text }), _jsxs("div", { className: "text-[11px] text-eu-slate-500 mt-1", children: [b.source, " \u00B7 confidence ", b.confidence?.toFixed(2) ?? "n/a", b.frame_sec != null ? ` · ${b.frame_sec.toFixed(0)}s` : ""] })] }, i))) })) }), _jsx(Section, { title: "EDMO / EUvsDisinfo matches", children: liveVideo.fact_check_matches.length === 0 ? (_jsx("p", { className: "text-sm text-eu-slate-500", children: "No fact-check matches above threshold." })) : (_jsx("div", { className: "space-y-2", children: liveVideo.fact_check_matches.map((m) => (_jsxs("a", { href: m.source_url, target: "_blank", rel: "noreferrer", className: "surface-tight p-3 block hover:border-eu-blue/40 transition", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("div", { className: "font-medium text-eu-ink text-sm", children: m.title }), _jsx("span", { className: "font-mono text-xs text-eu-slate-500 shrink-0", children: m.similarity.toFixed(2) })] }), _jsxs("div", { className: "text-xs text-eu-slate-500 mt-1", children: [m.source, " \u00B7 ", m.publication_date, " \u00B7 ", m.languages_documented.join(", ")] }), _jsx("p", { className: "text-xs text-eu-slate-600 mt-2 line-clamp-3", children: m.summary })] }, m.factcheck_id))) })) }), liveVideo.dsa_tdb_cross_refs.length > 0 && (_jsx(Section, { title: "EU DSA Transparency DB cross-reference", children: _jsx("div", { className: "space-y-2", children: liveVideo.dsa_tdb_cross_refs.map((c, i) => (_jsxs("div", { className: "surface-tight p-3 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "chip", children: c.platform.toUpperCase() }), _jsx("span", { className: "font-mono text-xs text-eu-slate-500", children: c.sample_decision_ground })] }), _jsxs("div", { className: "text-eu-slate-700", children: [_jsx("span", { className: "font-semibold tabular-nums", children: c.similar_actions_count.toLocaleString() }), " ", "actions taken on similar content (typical action:", " ", _jsx("span", { className: "font-mono text-xs", children: c.sample_action }), ")."] }), c.note && (_jsx("p", { className: "text-xs text-eu-slate-500 italic mt-1", children: c.note }))] }, i))) }) })), _jsx(Section, { title: "Transcript", children: _jsx("div", { className: "surface-tight p-3 max-h-72 overflow-y-auto space-y-1.5", children: liveVideo.transcript.segments.map((s, i) => (_jsxs("div", { className: "text-sm", children: [_jsxs("span", { className: "text-[10px] text-eu-slate-400 font-mono mr-2 align-top", children: [s.start.toFixed(0), "s \u00B7 ", s.speaker] }), _jsx("span", { className: "text-eu-slate-700", children: s.text })] }, i))) }) }), _jsx(Section, { title: "Provenance & metadata", children: _jsxs("dl", { className: "grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs", children: [_jsx("dt", { className: "text-eu-slate-500", children: "Source URL" }), _jsx("dd", { className: "font-mono break-all", children: _jsx("a", { href: m.url, target: "_blank", rel: "noreferrer", className: "text-eu-blue hover:underline", children: m.url }) }), _jsx("dt", { className: "text-eu-slate-500", children: "Hashtags" }), _jsx("dd", { children: m.hashtags.join(" ") || "—" }), _jsx("dt", { className: "text-eu-slate-500", children: "Platform AI label present" }), _jsx("dd", { children: m.has_platform_ai_label ? "Yes" : "No (audited under AI Act Art. 50)" }), _jsx("dt", { className: "text-eu-slate-500", children: "Lineage audio ID" }), _jsx("dd", { className: "font-mono", children: m.audio_id ?? "n/a" }), _jsx("dt", { className: "text-eu-slate-500", children: "Explicit root source" }), _jsx("dd", { children: m.is_explicit_root_source ? "Yes" : "No" }), _jsx("dt", { className: "text-eu-slate-500", children: "3rd-party synthetic-media likelihood" }), _jsxs("dd", { className: "font-mono", children: [synth != null ? synth.toFixed(2) : "n/a", " ", _jsx("span", { className: "text-eu-slate-400", children: "(metadata only \u2014 never gates a gap on its own)" })] }), _jsx("dt", { className: "text-eu-slate-500", children: "Severity components" }), _jsxs("dd", { className: "font-mono", children: ["reach ", liveVideo.severity.components.reach, " \u00B7 recency ", liveVideo.severity.components.recency, " \u00B7 signal ", liveVideo.severity.components.signal] }), _jsx("dt", { className: "text-eu-slate-500", children: "Scoring outcome" }), _jsxs("dd", { className: "font-mono", children: ["base ", liveVideo.severity.base_score?.toFixed(0) ?? "n/a", " \u00B7 final ", liveVideo.severity.final_score?.toFixed(0) ?? liveVideo.severity.score.toFixed(0), liveVideo.severity.root_multiplier_applied ? " · root multiplier" : "", liveVideo.severity.critical_floor_applied ? " · critical floor" : ""] })] }) }), _jsx("div", { className: "mx-6 mt-6 border-t border-eu-slate-200 pt-4", children: _jsx("h3", { className: "section-heading mb-3", children: "User Actions" }) }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 px-6 pb-8", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [!approved && (_jsx("button", { type: "button", disabled: isReviewing, onClick: () => updateReviewStatus("approved"), className: "inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60", children: "Approve" })), approved && (_jsx("button", { type: "button", disabled: isReviewing, onClick: () => updateReviewStatus("additional_review"), className: "inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60", children: "Remove approval" }))] }), _jsx(Link, { to: `/briefing?video=${liveVideo.metadata.video_id}`, className: "inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-eu-blue text-white font-medium hover:bg-eu-blue/90", children: "Generate parliamentary briefing \u2192" })] })] })] })] }), document.body);
}
function Section({ title, children }) {
    return (_jsxs("div", { className: "px-6 mt-6", children: [_jsx("h3", { className: "section-heading mb-2", children: title }), children] }));
}
function ReachMetric({ label, value, emphasized = false, }) {
    return (_jsxs("div", { className: "rounded-md bg-eu-slate-50 px-3 py-2", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-eu-slate-500", children: label }), _jsx("div", { className: `mt-0.5 font-serif text-lg font-semibold tabular-nums ${emphasized ? "text-eu-blue" : "text-eu-ink"}`, children: compactNumber(value) })] }));
}
