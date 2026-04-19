import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        trigger: "Raises an indicator when reasonable AI-involvement signals are present and the platform has not surfaced the required AI disclosure label.",
        evidence: "AI-related hashtags or description text, EDMO/deepfake match flags, optional synthetic-media metadata, platform label state.",
        note: "Narrative Radar does not declare the content AI-generated. It audits whether the platform label is present.",
    },
    {
        ref: "DSA Art. 34-35",
        short: "Systemic-risk mitigation",
        trigger: "Raises an indicator when a claim matches a documented EDMO / EUvsDisinfo narrative and the platform's own DSA Transparency Database filings show action on similar content elsewhere.",
        evidence: "Matched fact-check URL, similarity score, platform, view count, DSA TDB action counts and decision grounds, optional derivative spread.",
        note: "The platform's own transparency submissions are used as an external admission signal, not as a legal finding by this system.",
    },
    {
        ref: "DSA Art. 26",
        short: "Coordinated spread",
        trigger: "Raises an indicator when the same narrative cluster, or reused audio lineage, appears across enough distinct accounts within the configured time window.",
        evidence: "Cluster ID, distinct accounts, distinct languages, video IDs in window, audio ID, derivative count, aggregate reach.",
        note: "Cross-language spread elevates severity, but the output remains an investigative indicator requiring human review.",
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
    return (_jsxs("div", { className: "space-y-7", children: [_jsxs("header", { className: "space-y-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "badge bg-eu-blue/10 text-eu-blue border border-eu-blue/20", children: "EU AI Act explainability" }), _jsx("span", { className: "badge bg-emerald-100 text-emerald-800 border border-emerald-200", children: "Traceability first" })] }), _jsxs("div", { children: [_jsx("h1", { className: "font-serif text-2xl text-eu-ink font-semibold", children: "Documentation" }), _jsx("p", { className: "mt-0.5 max-w-4xl text-sm text-eu-slate-600", children: "How Narrative Radar processes public video evidence, combines models with deterministic legal-indicator rules, preserves provenance, and keeps human review between every indicator and any external action." })] })] }), _jsxs("section", { className: "grid gap-4 lg:grid-cols-[1.25fr_0.75fr]", children: [_jsxs("article", { className: "surface p-5", children: [_jsx("div", { className: "section-heading mb-2", children: "Purpose & scope" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "Decision support for platform accountability" }), _jsx("p", { className: "mt-2 text-sm leading-6 text-eu-slate-700", children: "Narrative Radar surfaces indicators that a platform may not have applied obligations already required by EU law. It is built for parliamentary aides, legal reviewers, DPOs, and oversight staff who need to inspect evidence quickly without turning model output into an automated judgment." }), _jsx("p", { className: "mt-3 text-sm leading-6 text-eu-slate-700", children: "The system does not classify content as disinformation, does not decide whether content is AI-generated, and does not file complaints, removals, takedown requests, or enforcement actions. Every compliance gap is an indicator for investigation only." })] }), _jsxs("aside", { className: "surface p-5 bg-amber-50 border-amber-200", children: [_jsx("div", { className: "section-heading mb-2 text-amber-800", children: "Non-negotiable guardrail" }), _jsx("p", { className: "text-sm leading-6 text-amber-950", children: "Outputs are indicators, not legal determinations. Human review and qualified legal assessment are required before any action is taken." }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsx("span", { className: "chip bg-white/80 text-amber-900", children: "No auto-escalation" }), _jsx("span", { className: "chip bg-white/80 text-amber-900", children: "No takedown tooling" }), _jsx("span", { className: "chip bg-white/80 text-amber-900", children: "No truth labels" })] })] })] }), _jsxs("section", { children: [_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "section-heading", children: "End-to-end pipeline" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "From public URL to reviewed briefing evidence" })] }), _jsx("div", { className: "grid gap-3 md:grid-cols-2 xl:grid-cols-3", children: PIPELINE_STEPS.map((step) => (_jsxs("article", { className: "surface-tight p-4", children: [_jsx("h3", { className: "text-sm font-semibold text-eu-ink", children: step.title }), _jsx("p", { className: "mt-2 text-sm leading-6 text-eu-slate-600", children: step.body })] }, step.title))) })] }), _jsxs("section", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs("article", { className: "surface p-5", children: [_jsx("div", { className: "section-heading mb-3", children: "Multi-modal processing" }), _jsx("div", { className: "space-y-3", children: MODALITIES.map(([label, body]) => (_jsxs("div", { className: "grid gap-2 border-b border-eu-slate-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[10rem_1fr]", children: [_jsx("div", { className: "font-mono text-xs font-semibold text-eu-blue", children: label }), _jsx("p", { className: "text-sm leading-6 text-eu-slate-600", children: body })] }, label))) })] }), _jsxs("article", { className: "surface p-5", children: [_jsx("div", { className: "section-heading mb-3", children: "Multi-model orchestration" }), _jsx("div", { className: "space-y-3", children: MODELS.map(([label, body]) => (_jsxs("div", { className: "grid gap-2 border-b border-eu-slate-100 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[10rem_1fr]", children: [_jsx("div", { className: "font-mono text-xs font-semibold text-eu-blue", children: label }), _jsx("p", { className: "text-sm leading-6 text-eu-slate-600", children: body })] }, label))) })] })] }), _jsxs("section", { children: [_jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "section-heading", children: "Explainability of indicators" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "Why an item appears in the evidence view" })] }), _jsx("div", { className: "grid gap-4 xl:grid-cols-3", children: INDICATORS.map((indicator) => (_jsxs("article", { className: "surface p-5", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "badge bg-eu-blue text-white", children: indicator.ref }), _jsx("span", { className: "chip", children: indicator.short })] }), _jsx(Info, { label: "Trigger", value: indicator.trigger }), _jsx(Info, { label: "Evidence shown", value: indicator.evidence }), _jsx(Info, { label: "Boundary", value: indicator.note })] }, indicator.ref))) })] }), _jsxs("section", { className: "grid gap-4 lg:grid-cols-[0.9fr_1.1fr]", children: [_jsxs("article", { className: "surface p-5", children: [_jsx("div", { className: "section-heading mb-2", children: "Traceability & audit logs" }), _jsx("h2", { className: "font-serif text-xl font-semibold text-eu-ink", children: "Tamper-evident operational record" }), _jsxs("p", { className: "mt-2 text-sm leading-6 text-eu-slate-700", children: ["State-changing API actions write append-only JSONL records through", _jsx("code", { className: "mx-1 font-mono text-xs", children: "backend/audit.py" }), ". Each event carries actor, role, timestamp, action detail, previous hash, and entry hash so the DPO view can verify the SHA-256 chain."] }), _jsxs("p", { className: "mt-3 text-sm leading-6 text-eu-slate-700", children: ["Read access is gated by a hackathon-grade", _jsx("code", { className: "mx-1 font-mono text-xs", children: "X-Role: dpo" }), "check. A production deployment must replace this with institutional SSO and role-based access control."] })] }), _jsxs("article", { className: "surface p-5", children: [_jsx("div", { className: "section-heading mb-3", children: "Logged event families" }), _jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: AUDIT_EVENTS.map((event) => (_jsx("div", { className: "surface-tight p-3 text-sm text-eu-slate-700", children: event }, event))) })] })] }), _jsxs("section", { className: "surface p-5", children: [_jsx("div", { className: "section-heading mb-2", children: "Human oversight & limitations" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(Limit, { title: "Mandatory review", body: "Reviewers approve, remove approval, or send an item for additional review before briefings are used outside the system." }), _jsx(Limit, { title: "Language confidence", body: "Lower-confidence languages surface human-review warnings because transcription and claim extraction quality can degrade." }), _jsx(Limit, { title: "Prototype boundaries", body: "Demo data and fallbacks keep the prototype reliable without claiming production-grade live ingestion, corpus coverage, or model calibration." })] })] })] }));
}
function Info({ label, value }) {
    return (_jsxs("div", { className: "mt-3 first:mt-0", children: [_jsx("div", { className: "text-[10px] font-semibold uppercase tracking-wider text-eu-slate-500", children: label }), _jsx("p", { className: "mt-1 text-sm leading-6 text-eu-slate-700", children: value })] }));
}
function Limit({ title, body }) {
    return (_jsxs("article", { className: "border-l-2 border-eu-blue/30 pl-4", children: [_jsx("h3", { className: "text-sm font-semibold text-eu-ink", children: title }), _jsx("p", { className: "mt-1 text-sm leading-6 text-eu-slate-600", children: body })] }));
}
