import type { AnalyzedVideo } from "../lib/types";
import type { MouseEvent } from "react";
import { api } from "../lib/api";
import { compactNumber, flag, platformLabel, relativeDate } from "../lib/format";
import { SeverityMeter } from "./SeverityMeter";
import { ViolationBadge } from "./ViolationBadge";

export function VideoCard({
  video,
  onOpen,
  onBriefing,
  onApproved,
}: {
  video: AnalyzedVideo;
  onOpen: () => void;
  onBriefing?: () => void;
  onApproved?: (video: AnalyzedVideo) => void;
}) {
  const m = video.metadata;
  const topMatch = video.fact_check_matches[0];
  const lowConf = video.transcript.confidence !== "high";
  const approved = video.human_review.status === "approved";

  async function approve(e: MouseEvent) {
    e.stopPropagation();
    const updated = await api.approveVideo(m.video_id);
    onApproved?.(updated);
  }

  return (
    <button
      onClick={onOpen}
      className="surface text-left w-full h-full p-5 hover:shadow-lg hover:border-eu-blue/40 transition-all flex flex-col"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] sm:grid-cols-[minmax(0,1fr)_10rem] gap-5 items-start">
        <div className="min-w-0">
          <div className="min-h-[3rem] flex flex-wrap content-start items-start gap-1.5 mb-1.5">
            <span className="chip">{platformLabel(m.platform)}</span>
            <span className="chip">{flag(m.language)} {m.language.toUpperCase()}</span>
            {video.cluster_id && (
              <span className="chip bg-eu-blue/5 text-eu-blue">
                cluster: {video.cluster_id.replace(/_/g, " ")}
              </span>
            )}
            {lowConf && (
              approved ? (
                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200">
                  review approved
                </span>
              ) : (
                <span className="badge bg-amber-100 text-amber-800 border border-amber-200">
                  ! human review required
                </span>
              )
            )}
            {video.derivative_spread.status === "pending" && (
              <span className="badge bg-eu-blue/10 text-eu-blue border border-eu-blue/20">
                lineage pending
              </span>
            )}
            {video.derivative_spread.status === "complete" && (
              <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200">
                spread {video.derivative_spread.derivative_count} · {compactNumber(video.derivative_spread.aggregate_reach)}
              </span>
            )}
          </div>
          <h3 className="min-h-[3rem] font-serif font-semibold text-eu-ink text-lg leading-tight line-clamp-2">
            {m.title}
          </h3>
          <div className="min-h-[1.25rem] text-sm text-eu-slate-500 mt-1 truncate">
            {m.author} · {compactNumber(m.view_count)} views · uploaded {relativeDate(m.upload_date)}
          </div>
        </div>
        <div className="w-40 shrink-0 pt-1">
          <SeverityMeter
            score={video.severity.score}
            label={video.severity.label}
            details={video.severity}
          />
        </div>
      </div>

      <div className="mt-4 min-h-[2rem] flex flex-wrap content-start gap-1.5">
        {video.compliance_gaps.length > 0 ? (
          video.compliance_gaps.map((g) => (
            <ViolationBadge
              key={g.article_ref}
              articleRef={g.article_ref}
              severity={g.severity}
            />
          ))
        ) : (
          <span className="sr-only">No compliance gap indicators above threshold</span>
        )}
      </div>

      {topMatch && (
        <div className="mt-3 text-xs border-t border-eu-slate-100 pt-3">
          <div className="section-heading mb-1">Top fact-check match</div>
          <div className="min-h-[2.5rem] text-eu-slate-700 line-clamp-2">
            {topMatch.title}
          </div>
          <div className="text-eu-slate-500 mt-1 grid grid-cols-[minmax(0,auto)_auto_auto] items-center justify-start gap-2">
            <span className="truncate">{topMatch.source}</span>
            <span>·</span>
            <span className="font-mono">similarity {topMatch.similarity.toFixed(2)}</span>
          </div>
        </div>
      )}

      {!topMatch && (
        <div className="mt-3 text-xs border-t border-eu-slate-100 pt-3">
          <div className="section-heading mb-1">Top fact-check match</div>
          <div className="min-h-[2.5rem] text-eu-slate-500 italic">No fact-check match above threshold.</div>
          <div className="text-eu-slate-500 mt-1">&nbsp;</div>
        </div>
      )}

      <div className="mt-3 text-xs min-h-[3.5rem]">
        <div className="section-heading mb-1">DSA Transparency DB cross-reference</div>
        {video.dsa_tdb_cross_refs.length > 0 ? (
          <div className="text-eu-slate-700">
            {video.dsa_tdb_cross_refs[0].platform.toUpperCase()} has reported{" "}
            <span className="font-semibold tabular-nums">
              {video.dsa_tdb_cross_refs[0].similar_actions_count.toLocaleString()}
            </span>{" "}
            actions on similar content
            {video.dsa_tdb_cross_refs.length > 1 ? ` (across ${video.dsa_tdb_cross_refs.length} grounds)` : ""}.
          </div>
        ) : (
          <div className="text-eu-slate-500 italic">No platform action cross-reference for this item.</div>
        )}
      </div>

      <div className="mt-auto pt-4 flex justify-end gap-2">
        {!approved && (
          <span
            onClick={approve}
            className="text-xs px-3 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
          >
            Approve
          </span>
        )}
        {approved && (
          <span className="text-xs px-3 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800">
            Approved
          </span>
        )}
        {onBriefing && (
          <span
            onClick={(e) => { e.stopPropagation(); onBriefing(); }}
            className="text-xs px-3 py-1 rounded-md bg-eu-blue text-white hover:bg-eu-blue/90 cursor-pointer"
          >
            Open briefing
          </span>
        )}
      </div>
    </button>
  );
}
