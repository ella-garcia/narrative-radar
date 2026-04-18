import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, } from "recharts";
import { compactNumber } from "../lib/format";
export function ClusterMap({ clusters, onClickCluster, }) {
    if (!clusters.length) {
        return (_jsx("div", { className: "text-sm text-eu-slate-500 italic py-12 text-center", children: "No narrative clusters yet \u2014 ingest a few videos to populate the map." }));
    }
    const data = clusters.map((c) => ({
        x: c.languages.length,
        y: c.max_severity,
        z: Math.max(60, Math.log10(Math.max(c.total_reach, 1)) * 90),
        label: c.cluster_id,
        pretty: c.cluster_id.replace(/_/g, " "),
        reach: c.total_reach,
        languages: c.languages,
        refs: c.article_refs,
        nVideos: c.video_ids.length,
    }));
    return (_jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(ScatterChart, { margin: { top: 12, right: 24, bottom: 8, left: -10 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#EAF0F7" }), _jsx(XAxis, { type: "number", dataKey: "x", name: "languages", domain: [0, "dataMax + 1"], allowDecimals: false, tick: { fontSize: 11, fill: "#5A6E89" }, label: {
                        value: "Languages spanned (cross-language ≥ 2 → Art. 26 elevated)",
                        position: "insideBottom",
                        offset: -2,
                        style: { fontSize: 10, fill: "#5A6E89" },
                    } }), _jsx(YAxis, { type: "number", dataKey: "y", name: "severity", domain: [0, 100], tick: { fontSize: 11, fill: "#5A6E89" }, label: {
                        value: "Max severity",
                        angle: -90,
                        position: "insideLeft",
                        offset: 18,
                        style: { fontSize: 10, fill: "#5A6E89" },
                    } }), _jsx(ZAxis, { type: "number", dataKey: "z", range: [60, 700] }), _jsx(Tooltip, { cursor: { strokeDasharray: "3 3" }, content: ({ active, payload }) => {
                        if (!active || !payload?.length)
                            return null;
                        const p = payload[0].payload;
                        return (_jsxs("div", { className: "surface-tight p-3 text-xs max-w-xs", children: [_jsx("div", { className: "font-semibold text-eu-ink mb-1 capitalize", children: p.pretty }), _jsxs("div", { className: "text-eu-slate-500", children: [p.nVideos, " videos \u00B7 ", compactNumber(p.reach), " reach"] }), _jsxs("div", { className: "text-eu-slate-500", children: ["Languages: ", p.languages.join(", ")] }), p.refs.length > 0 && (_jsxs("div", { className: "text-eu-slate-500 mt-1", children: ["Indicators: ", p.refs.join(" · ")] }))] }));
                    } }), _jsx(Scatter, { data: data, fill: "#003399", fillOpacity: 0.65, onClick: (d) => onClickCluster?.(d.label) })] }) }));
}
