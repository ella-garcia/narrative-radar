import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { severityBg, severityColor } from "../lib/format";
export function SeverityMeter({ score, label, size = "md", }) {
    const pct = Math.max(0, Math.min(100, score));
    const trackH = size === "sm" ? "h-1.5" : "h-2";
    const labelTxt = size === "sm" ? "text-[10px]" : "text-xs";
    const valueTxt = size === "sm" ? "text-base" : "text-2xl font-serif";
    return (_jsxs("div", { className: "w-full", children: [_jsxs("div", { className: "flex items-baseline justify-between mb-1", children: [_jsx("span", { className: `${labelTxt} font-semibold uppercase tracking-wider ${severityColor(label)}`, children: label }), _jsx("span", { className: `${valueTxt} ${severityColor(label)} tabular-nums`, children: pct.toFixed(0) })] }), _jsx("div", { className: `w-full ${trackH} rounded-full bg-eu-slate-100 overflow-hidden`, children: _jsx("div", { className: `${trackH} ${severityBg(label)} transition-[width] duration-500`, style: { width: `${pct}%` } }) })] }));
}
