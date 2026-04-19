import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Feed } from "./pages/Feed";
import { Briefing } from "./pages/Briefing";
import { LegalBasis } from "./pages/LegalBasis";
import { Audit } from "./pages/Audit";
import { Documentation } from "./pages/Documentation";
import { Forensics } from "./pages/Forensics";
export default function App() {
    return (_jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "feed", element: _jsx(Feed, {}) }), _jsx(Route, { path: "briefing", element: _jsx(Briefing, {}) }), _jsx(Route, { path: "forensics", element: _jsx(Forensics, {}) }), _jsx(Route, { path: "legal", element: _jsx(LegalBasis, {}) }), _jsx(Route, { path: "documentation", element: _jsx(Documentation, {}) }), _jsx(Route, { path: "audit", element: _jsx(Audit, {}) })] }) }));
}
