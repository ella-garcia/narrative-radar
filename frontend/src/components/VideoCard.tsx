import type { AnalyzedVideo } from "../lib/types";
import { compactNumber, flag, platformLabel, relativeDate } from "../lib/format";
import { SeverityMeter } from "./SeverityMeter";
import { ViolationBadge } from "./ViolationBadge";

export function VideoCard({
  video,
  onOpen,
  onBriefing,
}: {
  video: AnalyzedVideo;
  onOpen: () => void;
  onBriefing?: () => void;
}) {
  const m = video.metadata;
  const topMatch = video.fact_check_matches[0];
  const lowConf = video.transcript.confidence !== "high";

  return (
    <button
      onClick={onOpen}
      className="surface text-left w-full p-5 hover:shadow-lg hover:border-eu-blue/40 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="chip">{platformLabel(m.platform)}</span>
            <span className="chip">{flag(m.language)} {m.language.toUpperCase()}</span>
            {video.cluster_id && (
              <span className="chip bg-eu-blue/5 text-eu-blue">
                cluster: {video.cluster_id.replace(/_/g, " ")}
              </span>
            )}
            {lowConf && (
              <span className="badge bg-amber-100 text-amber-800 border border-amber-200">
                ⚠ human review required
              </span>
            )}
          </div>
          <h3 className="font-serif font-semibold text-eu-ink text-lg leading-tight truncate">
            {m.title}
          </h3>
          <div className="text-sm text-eu-slate-500 mt-1">
            {m.author} · {compactNumber(m.view_count)} views · uploaded {relativeDate(m.upload_date)}
          </div>
        </div>
        <div className="w-36 shrink-0">
          <SeverityMeter score={video.severity.score} label={video.severity.label} />
        </div>
      </div>

      {video.compliance_gaps.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {video.compliance_gaps.map((g) => (
            <ViolationBadge
              key={g.article_ref}
              articleRef={g.article_ref}
              severity={g.severity}
            />
          ))}
        </div>
      )}

      {topMatch && (
        <div className="mt-4 text-xs border-t border-eu-slate-100 pt-3">
          <div className="section-heading mb-1">Top fact-check match</div>
          <div className="text-eu-slate-700 line-clamp-2">{topMatch.title}</div>
          <div className="text-eu-slate-500 mt-1 flex items-center gap-2">
            <span>{topMatch.source}</span>
            <span>·</span>
            <span className="font-mono">similarity {topMatch.similarity.toFixed(2)}</span>
          </div>
        </div>
      )}

      {video.dsa_tdb_cross_refs.length > 0 && (
        <div className="mt-3 text-xs">
          <div className="section-heading mb-1">DSA Transparency DB cross-reference</div>
          <div className="text-eu-slate-700">
            {video.dsa_tdb_cross_refs[0].platform.toUpperCase()} has reported{" "}
            <span className="font-semibold tabular-nums">
              {video.dsa_tdb_cross_refs[0].similar_actions_count.toLocaleString()}
            </span>{" "}
            actions on similar content
            {video.dsa_tdb_cross_refs.length > 1 ? ` (across ${video.dsa_tdb_cross_refs.length} grounds)` : ""}.
          </div>
        </div>
      )}

      {onBriefing && (
        <div className="mt-4 flex justify-end">
          <span
            onClick={(e) => { e.stopPropagation(); onBriefing(); }}
            className="text-xs px-3 py-1 rounded-md bg-eu-blue text-white hover:bg-eu-blue/90 cursor-pointer"
          >
            Open briefing →
          </span>
        </div>
      )}
    </button>
  );
}
