import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LegalRefs } from "../lib/types";

export function LegalBasis() {
  const [refs, setRefs] = useState<LegalRefs | null>(null);
  useEffect(() => {
    api.legalRefs().then(setRefs);
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl text-eu-ink font-semibold">Legal basis</h1>
        <p className="text-sm text-eu-slate-500 mt-0.5">
          The articles Narrative Radar maps indicators against. We do not make legal
          determinations — qualified review is required.
        </p>
      </div>

      {!refs ? (
        <div className="text-eu-slate-500 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(refs).map(([ref, body]) => (
            <article key={ref} className="surface p-5">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h2 className="font-serif text-lg text-eu-ink font-semibold">
                  {ref}{" "}
                  <span className="text-sm text-eu-slate-500 font-sans font-normal">
                    — {body.short}
                  </span>
                </h2>
                {body.enforcement_date && (
                  <span className="badge bg-amber-100 text-amber-800 border border-amber-200">
                    enforceable {body.enforcement_date}
                  </span>
                )}
              </div>
              <div className="text-xs text-eu-slate-500 font-mono mb-2">
                {body.instrument} ·{" "}
                <a href={body.official_url} target="_blank" rel="noreferrer" className="text-eu-blue underline">
                  EUR-Lex
                </a>
              </div>
              <p className="text-sm text-eu-slate-700">{body.summary}</p>
              <p className="text-sm text-eu-slate-600 italic mt-3 border-l-2 border-eu-blue/30 pl-3">
                <span className="font-semibold not-italic text-eu-ink">Indicator basis:</span>{" "}
                {body.indicator_basis}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="surface p-5 bg-amber-50 border-amber-200 text-sm text-amber-900">
        <strong>What we are not.</strong> Narrative Radar does not classify content
        as "disinformation" or "AI-generated". We surface indicators of potential
        platform obligation failures, grounded in EDMO / EUvsDisinfo determinations
        and the platforms' own DSA Transparency Database submissions. Detection of
        synthetic media is treated as metadata only and never gates a compliance
        gap on its own.
      </div>
    </div>
  );
}
