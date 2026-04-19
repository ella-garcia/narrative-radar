import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "./Logo";
const NAV = [
    { to: "/", label: "Dashboard" },
    { to: "/feed", label: "Video feed" },
    { to: "/briefing", label: "Briefings" },
    { to: "/legal", label: "Legal basis" },
    { to: "/audit", label: "Audit log" },
];
export function Layout() {
    return (_jsxs("div", { className: "min-h-full", children: [_jsxs("header", { className: "border-b border-eu-slate-200 bg-white", children: [_jsxs("div", { className: "max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between", children: [_jsx(Logo, {}), _jsx("nav", { className: "flex items-center gap-1", children: NAV.map((n) => (_jsx(NavLink, { to: n.to, end: n.to === "/", className: ({ isActive }) => `px-3 py-1.5 rounded-md text-sm font-medium transition ${isActive
                                        ? "bg-eu-blue text-white"
                                        : "text-eu-slate-700 hover:bg-eu-slate-100"}`, children: n.label }, n.to))) }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-eu-slate-500", children: [_jsxs("div", { className: "hidden md:flex items-center gap-1.5", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-500" }), _jsx("span", { children: "backend live" })] }), _jsx("span", { className: "kbd", children: "v0.1 \u00B7 prototype" })] })] }), _jsx("div", { className: "max-w-[1280px] mx-auto px-6 pb-2 -mt-1", children: _jsx("p", { className: "text-[11px] text-eu-slate-500 italic", children: "Indicators of potential platform obligation failures under EU law. All findings require human review and qualified legal assessment before any action is taken." }) })] }), _jsx("main", { className: "max-w-[1280px] mx-auto px-6 py-6", children: _jsx(Outlet, {}) }), _jsx("footer", { className: "max-w-[1280px] mx-auto px-6 py-8 mt-8 border-t border-eu-slate-200 text-xs text-eu-slate-500", children: _jsxs("div", { className: "flex flex-wrap justify-between gap-3", children: [_jsx("div", { children: "Narrative Radar \u2014 EU AI Hackathon 2026." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("span", { children: "Data: EUvsDisinfo \u00B7 EDMO \u00B7 DSA Transparency DB" }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: "No content classification, no automated enforcement." })] })] }) })] }));
}
