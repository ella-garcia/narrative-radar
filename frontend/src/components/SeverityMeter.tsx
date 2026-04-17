import { severityBg, severityColor } from "../lib/format";

export function SeverityMeter({
  score,
  label,
  size = "md",
}: {
  score: number;
  label: string;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, score));
  const trackH = size === "sm" ? "h-1.5" : "h-2";
  const labelTxt = size === "sm" ? "text-[10px]" : "text-xs";
  const valueTxt = size === "sm" ? "text-base" : "text-2xl font-serif";
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className={`${labelTxt} font-semibold uppercase tracking-wider ${severityColor(label)}`}>
          {label}
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
