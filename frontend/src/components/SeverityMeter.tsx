import { severityBg, severityColor } from "../lib/format";
import type { SeverityScore } from "../lib/types";

export function SeverityMeter({
  score,
  label,
  size = "md",
  details,
}: {
  score: number;
  label: string;
  size?: "sm" | "md";
  details?: SeverityScore;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const trackH = size === "sm" ? "h-1.5" : "h-2";
  const labelTxt = size === "sm" ? "text-[10px]" : "text-xs";
  const valueTxt = size === "sm" ? "text-base" : "text-2xl font-serif";
  const tooltip = details ? scoringTooltip(details) : undefined;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="inline-flex items-center gap-1.5">
          <span className={`${labelTxt} font-semibold uppercase tracking-wider ${severityColor(label)}`}>
            {label}
          </span>
          {tooltip && (
            <span className="relative inline-flex group">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-eu-slate-300 bg-white text-[10px] font-semibold text-eu-slate-500"
                aria-label={tooltip}
                title={tooltip}
              >
                i
              </span>
              <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-64 rounded-md border border-eu-slate-200 bg-white p-3 text-left text-[11px] font-normal leading-relaxed text-eu-slate-700 shadow-lg group-hover:block">
                {tooltip}
              </span>
            </span>
          )}
        </span>
        <span className={`${valueTxt} ${severityColor(label)} tabular-nums`}>
          {pct.toFixed(0)}
        </span>
      </div>
      <div className={`w-full ${trackH} rounded-full bg-eu-slate-100 overflow-hidden`}>
        <div
          className={`${trackH} ${severityBg(label)} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function scoringTooltip(details: SeverityScore): string {
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
