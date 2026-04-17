import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { NarrativeCluster } from "../lib/types";
import { compactNumber } from "../lib/format";

export function ClusterMap({
  clusters,
  onClickCluster,
}: {
  clusters: NarrativeCluster[];
  onClickCluster?: (id: string) => void;
}) {
  if (!clusters.length) {
    return (
      <div className="text-sm text-eu-slate-500 italic py-12 text-center">
        No narrative clusters yet — ingest a few videos to populate the map.
      </div>
    );
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

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAF0F7" />
        <XAxis
          type="number"
          dataKey="x"
          name="languages"
          domain={[0, "dataMax + 1"]}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#5A6E89" }}
          label={{
            value: "Languages spanned (cross-language ≥ 2 → Art. 26 elevated)",
            position: "insideBottom",
            offset: -2,
            style: { fontSize: 10, fill: "#5A6E89" },
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="severity"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#5A6E89" }}
          label={{
            value: "Max severity",
            angle: -90,
            position: "insideLeft",
            offset: 18,
            style: { fontSize: 10, fill: "#5A6E89" },
          }}
        />
        <ZAxis type="number" dataKey="z" range={[60, 700]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p: any = payload[0].payload;
            return (
              <div className="surface-tight p-3 text-xs max-w-xs">
                <div className="font-semibold text-eu-ink mb-1 capitalize">
                  {p.pretty}
                </div>
                <div className="text-eu-slate-500">
                  {p.nVideos} videos · {compactNumber(p.reach)} reach
                </div>
                <div className="text-eu-slate-500">
                  Languages: {p.languages.join(", ")}
                </div>
                {p.refs.length > 0 && (
                  <div className="text-eu-slate-500 mt-1">
                    Indicators: {p.refs.join(" · ")}
                  </div>
                )}
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          fill="#003399"
          fillOpacity={0.65}
          onClick={(d: any) => onClickCluster?.(d.label)}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
