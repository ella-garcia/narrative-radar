const PIPELINE_STEPS = [
  {
    title: "1. Ingest",
    body: "The user submits a public short-form video URL. The backend extracts platform metadata, including source URL, author handle, upload date, view count, language, hashtags, audio identifiers, and whether a platform AI label is already present.",
  },
  {
    title: "2. Transcribe and read frames",
    body: "Audio is transcribed with Whisper / WhisperX or a demo transcript fallback. Representative frames can be processed for OCR so on-screen text is available as evidence alongside speech.",
  },
  {
    title: "3. Extract claims",
    body: "GPT-4o-mini or a deterministic fallback converts transcript and OCR text into factual claims with categories, speakers, timestamps, and language-confidence warnings where needed.",
  },
  {
    title: "4. Match public determinations",
    body: "Claims are matched against EDMO and EUvsDisinfo fact-check records using embeddings with FAISS-style cosine search, or a deterministic hash-TF-IDF fallback at demo scale.",
  },
  {
    title: "5. Evaluate legal indicators",
    body: "Deterministic rule engines check for AI Act Art. 50 disclosure-label gaps, DSA Art. 34-35 systemic-risk signals, and DSA Art. 26 coordinated-spread signals.",
  },
  {
    title: "6. Review and brief",
    body: "Evidence, disclaimers, provenance, severity, and human-review status are shown before any parliamentary briefing is generated. Nothing is filed or escalated automatically.",
  },
];

const MODALITIES = [
  ["Audio / transcript", "Speech is transcribed into timestamped segments and factual claims."],
  ["Frames / OCR", "On-screen text is extracted when frames are available and shown as separate evidence."],
  ["Platform metadata", "Views, dates, language, hashtags, source URL, AI-label status, and audio IDs ground the analysis."],
  ["Lineage / reuse", "Shared-audio and derivative-spread signals show whether a narrative is reproduced across posts or languages."],
];

const DATA_SOURCING = [
  {
    title: "Demo cache first",
    body: "If a URL matches a pre-cached demo case, the backend returns metadata and transcript fixtures from backend/data without making a network call.",
  },
  {
    title: "Submitted URL metadata",
    body: "For non-demo URLs, yt-dlp is used narrowly on the single public URL submitted by a user. The prototype does not crawl feeds, search results, or profile histories.",
  },
  {
    title: "Optional media download",
    body: "Video download is disabled by default and only runs when ENABLE_MEDIA_DOWNLOADS=true. Temporary video, audio, and frame artifacts are cleaned up after processing.",
  },
  {
    title: "Opt-in provider enrichment",
    body: "YouTube Data API, TikAPI lineage, and optional Hive metadata run only when their API keys and config gates are present. Missing providers fall back safely.",
  },
  {
    title: "DSA Transparency Database",
    body: "The prototype uses a static DSA TDB-style seed for demo decision-ground aggregates. Production should replace it with a scheduled official dataset sync.",
  },
  {
    title: "Boundary",
    body: "No bulk scraping, private messages, private user data, account dossiers, or automated watchlist tooling are part of the current design.",
  },
];

const MODELS = [
  ["Whisper / WhisperX", "Multilingual transcription with demo fallbacks when live processing is unavailable."],
  ["GPT-4o-mini", "Structured claim extraction from transcript and OCR text."],
  ["Embeddings + FAISS", "Semantic matching to EDMO / EUvsDisinfo records, with hash-TF-IDF fallback."],
  ["Optional Hive", "Synthetic-media likelihood as metadata only, never as a standalone determination."],
  ["Claude", "Briefing generation when configured, otherwise a conservative deterministic template."],
  ["Python rule engines", "Deterministic compliance indicators in backend/compliance for Art. 50, Art. 34-35, and Art. 26."],
];

const INDICATORS = [
  {
    ref: "AI Act Art. 50",
    short: "Disclosure-label audit",
    trigger:
      "Raises an indicator when reasonable AI-involvement signals are present and the platform has not surfaced the required AI disclosure label.",
    evidence:
      "AI-related hashtags or description text, EDMO/deepfake match flags, optional synthetic-media metadata, platform label state.",
    note:
      "Narrative Radar does not declare the content AI-generated. It audits whether the platform label is present.",
  },
  {
    ref: "DSA Art. 34-35",
    short: "Systemic-risk mitigation",
    trigger:
      "Raises an indicator when a claim matches a documented EDMO / EUvsDisinfo narrative and the platform's own DSA Transparency Database filings show action on similar content elsewhere.",
    evidence:
      "Matched fact-check URL, similarity score, platform, view count, DSA TDB action counts and decision grounds, optional derivative spread.",
    note:
      "The platform's own transparency submissions are used as an external admission signal, not as a legal finding by this system.",
  },
  {
    ref: "DSA Art. 26",
    short: "Coordinated spread",
    trigger:
      "Raises an indicator when the same narrative cluster, or reused audio lineage, appears across enough distinct accounts within the configured time window.",
    evidence:
      "Cluster ID, distinct accounts, distinct languages, video IDs in window, audio ID, derivative count, aggregate reach.",
    note:
      "Cross-language spread elevates severity, but the output remains an investigative indicator requiring human review.",
  },
];

const AUDIT_EVENTS = [
  "ingest and ingest_failed",
  "lineage_enrichment_started, completed, and failed",
  "video_approved and video_additional_review",
  "briefing_generated",
  "storage_cleared",
];

export function Documentation() {
  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-eu-blue/10 text-eu-blue border border-eu-blue/20">
            EU AI Act explainability
          </span>
          <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200">
            Traceability first
          </span>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-eu-ink font-semibold">
            Documentation
          </h1>
          <p className="mt-0.5 max-w-4xl text-sm text-eu-slate-600">
            How Narrative Radar processes public video evidence, combines models
            with deterministic legal-indicator rules, preserves provenance, and
            keeps human review between every indicator and any external action.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="surface p-5">
          <div className="section-heading mb-2">Purpose & scope</div>
          <h2 className="font-serif text-xl font-semibold text-eu-ink">
            Decision support for platform accountability
          </h2>
          <p className="mt-2 text-sm leading-6 text-eu-slate-700">
            Narrative Radar surfaces indicators that a platform may not have
            applied obligations already required by EU law. It is built for
            parliamentary aides, legal reviewers, DPOs, and oversight staff who
            need to inspect evidence quickly without turning model output into
            an automated judgment.
          </p>
          <p className="mt-3 text-sm leading-6 text-eu-slate-700">
            The system does not classify content as disinformation, does not
            decide whether content is AI-generated, and does not file complaints,
            removals, takedown requests, or enforcement actions. Every compliance
            gap is an indicator for investigation only.
          </p>
        </article>

        <aside className="surface p-5 bg-amber-50 border-amber-200">
          <div className="section-heading mb-2 text-amber-800">
            Non-negotiable guardrail
          </div>
          <p className="text-sm leading-6 text-amber-950">
            Outputs are indicators, not legal determinations. Human review and
            qualified legal assessment are required before any action is taken.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip bg-white/80 text-amber-900">No auto-escalation</span>
            <span className="chip bg-white/80 text-amber-900">No takedown tooling</span>
            <span className="chip bg-white/80 text-amber-900">No truth labels</span>
          </div>
        </aside>
      </section>

      <section>
        <div className="mb-3">
          <div className="section-heading">End-to-end pipeline</div>
          <h2 className="font-serif text-xl font-semibold text-eu-ink">
            From public URL to reviewed briefing evidence
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PIPELINE_STEPS.map((step) => (
            <article key={step.title} className="surface-tight p-4">
              <h3 className="text-sm font-semibold text-eu-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-eu-slate-600">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface p-5">
        <div className="mb-3">
          <div className="section-heading">Current prototype data pulling</div>
          <h2 className="font-serif text-xl font-semibold text-eu-ink">
            Conservative sourcing, not broad scraping
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-eu-slate-600">
            The prototype is designed around explicit URLs, cached demo cases,
            and opt-in providers. It avoids feed crawling and account monitoring
            so the evidence trail stays narrow, reproducible, and reviewable.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DATA_SOURCING.map((source) => (
            <article key={source.title} className="surface-tight p-4">
              <h3 className="text-sm font-semibold text-eu-ink">{source.title}</h3>
              <p className="mt-2 text-sm leading-6 text-eu-slate-600">
                {source.body}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-eu-blue/20 bg-eu-blue/5 p-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="chip bg-white text-eu-blue">Preferred production path</span>
          </div>
          <p className="text-sm leading-6 text-eu-slate-700">
            If an EU-authorized platform-access API becomes available, it should
            replace best-effort public extraction because it is more reliable,
            auditable, and legally cleaner.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="surface p-5">
          <div className="section-heading mb-3">Multi-modal processing</div>
          <div className="space-y-3">
            {MODALITIES.map(([label, body]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-eu-slate-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[10rem_1fr]"
              >
                <div className="font-mono text-xs font-semibold text-eu-blue">
                  {label}
                </div>
                <p className="text-sm leading-6 text-eu-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface p-5">
          <div className="section-heading mb-3">Multi-model orchestration</div>
          <div className="space-y-3">
            {MODELS.map(([label, body]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-eu-slate-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[10rem_1fr]"
              >
                <div className="font-mono text-xs font-semibold text-eu-blue">
                  {label}
                </div>
                <p className="text-sm leading-6 text-eu-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section>
        <div className="mb-3">
          <div className="section-heading">Explainability of indicators</div>
          <h2 className="font-serif text-xl font-semibold text-eu-ink">
            Why an item appears in the evidence view
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {INDICATORS.map((indicator) => (
            <article key={indicator.ref} className="surface p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="badge bg-eu-blue text-white">{indicator.ref}</span>
                <span className="chip">{indicator.short}</span>
              </div>
              <Info label="Trigger" value={indicator.trigger} />
              <Info label="Evidence shown" value={indicator.evidence} />
              <Info label="Boundary" value={indicator.note} />
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="surface p-5">
          <div className="section-heading mb-2">Traceability & audit logs</div>
          <h2 className="font-serif text-xl font-semibold text-eu-ink">
            Tamper-evident operational record
          </h2>
          <p className="mt-2 text-sm leading-6 text-eu-slate-700">
            State-changing API actions write append-only JSONL records through
            <code className="mx-1 font-mono text-xs">backend/audit.py</code>.
            Each event carries actor, role, timestamp, action detail, previous
            hash, and entry hash so the DPO view can verify the SHA-256 chain.
          </p>
          <p className="mt-3 text-sm leading-6 text-eu-slate-700">
            Read access is gated by a hackathon-grade
            <code className="mx-1 font-mono text-xs">X-Role: dpo</code>
            check. A production deployment must replace this with institutional
            SSO and role-based access control.
          </p>
        </article>

        <article className="surface p-5">
          <div className="section-heading mb-3">Logged event families</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {AUDIT_EVENTS.map((event) => (
              <div key={event} className="surface-tight p-3 text-sm text-eu-slate-700">
                {event}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface p-5">
        <div className="section-heading mb-2">Human oversight & limitations</div>
        <div className="grid gap-4 md:grid-cols-3">
          <Limit
            title="Mandatory review"
            body="Reviewers approve, remove approval, or send an item for additional review before briefings are used outside the system."
          />
          <Limit
            title="Language confidence"
            body="Lower-confidence languages surface human-review warnings because transcription and claim extraction quality can degrade."
          />
          <Limit
            title="Prototype boundaries"
            body="Demo data and fallbacks keep the prototype reliable without claiming production-grade live ingestion, corpus coverage, or model calibration."
          />
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-eu-slate-500">
        {label}
      </div>
      <p className="mt-1 text-sm leading-6 text-eu-slate-700">{value}</p>
    </div>
  );
}

function Limit({ title, body }: { title: string; body: string }) {
  return (
    <article className="border-l-2 border-eu-blue/30 pl-4">
      <h3 className="text-sm font-semibold text-eu-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-eu-slate-600">{body}</p>
    </article>
  );
}
