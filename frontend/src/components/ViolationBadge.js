import { jsx as _jsx } from "react/jsx-runtime";
export function ViolationBadge({ articleRef, severity, }) {
    const palette = {
        high: "bg-sev-high/10 text-sev-high border-sev-high/30",
        medium: "bg-sev-medium/10 text-sev-medium border-sev-medium/30",
        low: "bg-sev-low/10 text-sev-low border-sev-low/30",
        informational: "bg-sev-info/10 text-sev-info border-sev-info/30",
    };
    return (_jsx("span", { className: `badge border ${palette[severity]} font-mono`, title: `Severity: ${severity}`, children: articleRef }));
}
