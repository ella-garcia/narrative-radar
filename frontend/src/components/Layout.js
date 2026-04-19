import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
const NAV = [
    { to: "/", label: "Dashboard" },
    { to: "/feed", label: "Video feed" },
    { to: "/briefing", label: "Briefings" },
    { to: "/forensics", label: "Forensics" },
    { to: "/audit", label: "Audit log" },
];
const DOC_NAV = [
    { to: "/documentation", label: "Platform Docs" },
    { to: "/legal", label: "Legal Basis" },
];
export function Layout() {
    const location = useLocation();
    const docsActive = DOC_NAV.some((n) => location.pathname === n.to);
    return (_jsxs("div", { className: "min-h-full", children: [_jsxs("header", { className: "border-b border-eu-slate-200 bg-white", children: [_jsxs("div", { className: "max-w-[1280px] mx-auto px-6 min-h-16 py-3 flex flex-wrap items-center justify-between gap-3", children: [_jsx(Logo, {}), _jsxs("nav", { className: "flex flex-wrap items-center justify-center gap-1", children: [NAV.map((n) => (_jsx(NavLink, { to: n.to, end: n.to === "/", className: ({ isActive }) => `px-3 py-1.5 rounded-md text-sm font-medium transition ${isActive
                                            ? "bg-eu-blue text-white"
                                            : "text-eu-slate-700 hover:bg-eu-slate-100"}`, children: n.label }, n.to))), _jsxs("div", { className: "relative group", children: [_jsx("button", { type: "button", "aria-haspopup": "true", className: `px-3 py-1.5 rounded-md text-sm font-medium transition ${docsActive
                                                    ? "bg-eu-blue text-white"
                                                    : "text-eu-slate-700 hover:bg-eu-slate-100"}`, children: "Documentation" }), _jsx("div", { className: "absolute right-0 z-20 mt-2 hidden min-w-44 rounded-md border border-eu-slate-200 bg-white p-1 shadow-card group-hover:block group-focus-within:block", children: DOC_NAV.map((n) => (_jsx(NavLink, { to: n.to, className: ({ isActive }) => `block rounded px-3 py-2 text-sm font-medium transition ${isActive
                                                        ? "bg-eu-blue/10 text-eu-blue"
                                                        : "text-eu-slate-700 hover:bg-eu-slate-100"}`, children: n.label }, n.to))) })] })] }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-eu-slate-500", children: [_jsxs("div", { className: "hidden md:flex items-center gap-1.5", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-500" }), _jsx("span", { children: "backend live" })] }), _jsx("span", { className: "kbd", children: "v0.1 \u00B7 prototype" })] })] }), _jsx("div", { className: "max-w-[1280px] mx-auto px-6 pb-2 -mt-1", children: _jsx("p", { className: "text-[11px] text-eu-slate-500 italic", children: "Indicators of potential platform obligation failures under EU law. All findings require human review and qualified legal assessment before any action is taken." }) })] }), _jsx("main", { className: "max-w-[1280px] mx-auto px-6 py-6", children: _jsx(Outlet, {}) }), _jsx("footer", { className: "max-w-[1280px] mx-auto px-6 py-8 mt-8 border-t border-eu-slate-200 text-xs text-eu-slate-500", children: _jsxs("div", { className: "flex flex-wrap justify-between gap-3", children: [_jsx("div", { children: "Narrative Radar \u2014 EU AI Hackathon 2026." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("span", { children: "Data: EUvsDisinfo \u00B7 EDMO \u00B7 DSA Transparency DB" }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: "No content classification, no automated enforcement." })] })] }) })] }));
}
