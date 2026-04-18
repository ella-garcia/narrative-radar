import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { severityBg, severityColor } from "../lib/format";
export function SeverityMeter({ score, label, size = "md", details, }) {
    const pct = Math.max(0, Math.min(100, score));
    const trackH = size === "sm" ? "h-1.5" : "h-2";
    const labelTxt = size === "sm" ? "text-[10px]" : "text-xs";
    const valueTxt = size === "sm" ? "text-base" : "text-2xl font-serif";
    const tooltip = details ? scoringTooltip(details) : undefined;
    return (_jsxs("div", { className: "w-full", children: [_jsxs("div", { className: "flex items-baseline justify-between mb-1", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: `${labelTxt} font-semibold uppercase tracking-wider ${severityColor(label)}`, children: label }), tooltip && (_jsxs("span", { className: "relative inline-flex group", children: [_jsx("span", { className: "inline-flex h-4 w-4 items-center justify-center rounded-full border border-eu-slate-300 bg-white text-[10px] font-semibold text-eu-slate-500", "aria-label": tooltip, title: tooltip, children: "i" }), _jsx("span", { className: "pointer-events-none absolute left-0 top-5 z-20 hidden w-64 rounded-md border border-eu-slate-200 bg-white p-3 text-left text-[11px] font-normal leading-relaxed text-eu-slate-700 shadow-lg group-hover:block", children: tooltip })] }))] }), _jsx("span", { className: `${valueTxt} ${severityColor(label)} tabular-nums`, children: pct.toFixed(0) })] }), _jsx("div", { className: `w-full ${trackH} rounded-full bg-eu-slate-100 overflow-hidden`, children: _jsx("div", { className: `${trackH} ${severityBg(label)} transition-[width] duration-500`, style: { width: `${pct}%` } }) })] }));
}
function scoringTooltip(details) {
    const base = details.base_score ?? details.score;
    const final = details.final_score ?? details.score;
    const modifiers = [
        details.root_multiplier_applied ? "root-source multiplier" : null,
        details.critical_floor_applied ? "critical floor" : null,
        details.lineage_threshold_triggered ? "lineage threshold" : null,
    ].filter(Boolean);
    return [
        `Severity score combines reach (${details.components.reach}), recency (${details.components.recency}), and signal (${details.components.signal}).`,
        `Base ${base.toFixed(0)}; final ${final.toFixed(0)}.`,
        modifiers.length ? `Modifiers: ${modifiers.join(", ")}.` : "No lineage/root modifiers applied.",
    ].join(" ");
}
