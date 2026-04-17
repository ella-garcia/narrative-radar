# Governance Framework

Narrative Radar is designed to *augment parliamentary staff capacity, not replace legal judgment.* The following commitments are part of the system, not optional add-ons.

## Five non-negotiable principles

### 1. Indicators only, never determinations

Every output of the system is an *indicator for investigation*. The disclaimer is hard-coded into the data model (`ComplianceGap.disclaimer`) and the briefing footer; it cannot be suppressed via configuration or feature flag.

A "Narrative Radar found a gap" line in any document, briefing, or external communication must be qualified by the disclaimer or the original data has been misused.

### 2. No content classification

The system does not classify content as "disinformation", "misinformation", "fake news", "AI-generated", "deepfake", or any equivalent label.

It does the following instead:
- It *matches* video transcripts against fact-checks **already published** by accredited EDMO-network organisations or EUvsDisinfo.
- It *audits* whether the platform applied the AI Act-mandated disclosure label to content that carries reasonable AI-involvement indicators.
- It *cross-references* against the platforms' own DSA Transparency Database submissions.

The original determination always belongs to a third party (EDMO member, EUvsDisinfo, or the platform itself). Narrative Radar reports the *combination* of those determinations.

### 3. Human-in-the-loop, mandatory

- Every compliance gap is surfaced to a human reviewer before any action.
- Every briefing requires an explicit user click to generate; nothing is auto-sent or auto-filed.
- The system has no API endpoint and no UI affordance for "auto-escalate", "auto-file complaint", "auto-takedown-request", or "auto-publish".
- Low-confidence languages (`ru/uk/be/zh/bg/sr/ro`) trigger a mandatory "human review required" UI warning that cannot be dismissed in the per-video evidence view.

### 4. Provenance and citation, mandatory

Every claim that the system surfaces:
- Has a source URL pointing to the original fact-check (EDMO / EUvsDisinfo / DSA TDB).
- Has the publishing organisation named.
- Has a similarity / confidence score.

Every briefing exposes those URLs in the Evidence Pack section. A briefing that elides the citations is not a Narrative Radar briefing.

### 5. No targeting of individuals

The system processes public, high-reach short-form video content tied to **observable platform-level patterns**.

- It does not build dossiers on individual social-media users.
- It does not export data about specific accounts beyond what is required to evidence a coordinated-behaviour indicator (and even there, only the *handle* and *posting time* are recorded).
- It does not surface individual users' private data (email, phone, IP, geolocation, friends list).
- It must not be configured to pre-screen content from specific named individuals.

## Roles and responsibilities

| Role | Responsibility |
|---|---|
| **Parliamentary aide** (operator) | Ingests URLs, reviews indicators, decides whether to escalate to MP. Trained on what indicators do and do not mean. |
| **MP / elected official** (consumer) | Receives briefings. Decides what political action to take. Is aware that briefings are evidentiary, not adjudicative. |
| **Legal counsel** (gatekeeper) | Reviews any briefing before it informs a formal complaint, statement, or referral. Required reviewer for DSA Art. 24(5) complaints filed using the template in `DSA_COMPLAINT_TEMPLATE.md`. |
| **Data protection officer** (oversight) | Owns the data-retention policy, audit log, and any GDPR-related questions. |
| **Operating institution** (sponsor) | Owns the deployment, accountable to the public for use of the system. |

## Data retention

| Data type | Retention | Rationale |
|---|---|---|
| Raw downloaded video files | 7 days | Required for re-analysis and audit; deleted thereafter to limit copyright exposure. |
| Transcripts | 90 days | Sufficient for investigation cycles. |
| Extracted claims, matches, gap indicators | 12 months | Aligns with electoral-cycle review windows. |
| Briefings issued | Indefinite | Audit trail of what was communicated to elected officials. |
| Audit log (who-ingested-what-when) | 24 months | Detect misuse. |

All data is stored in EU-resident infrastructure. No cross-border transfer is permitted without explicit DPO sign-off.

## Audit trail (production)

In any deployment beyond hackathon scope, the system must log to an append-only store:

- `ingest`: user, URL, timestamp, returned `video_id`
- `briefing_generated`: user, video_ids, timestamp, briefing-hash
- `evidence_exported`: user, target (clipboard/PDF/JSON), timestamp
- `gap_threshold_changed`: user, old, new, timestamp
- `corpus_updated`: which fact-checks added/removed, timestamp

The audit log is reviewable by the operating institution's DPO and, in the event of a complaint about misuse, by an external regulator.

## Misuse scenarios and mitigations

| Misuse scenario | Mitigation |
|---|---|
| User A pre-screens content from a named political opponent | Audit log will surface the pattern; operating institution must investigate. UI does not provide a "watch this account" affordance. |
| Indicator is published as "the platform broke the law" | Disclaimer mandatory in every output; legal counsel must review before any external publication. Public-affairs training is mandatory for users. |
| System used to file enforcement actions automatically | No API endpoint exists for this. Briefings are human-readable PDFs, not machine-actionable; complaint filing requires manual sign-off. |
| Synthetic-media metadata used to publicly accuse a video of being AI-generated | The score field is labelled "metadata only — never gates a gap on its own" in the UI; the briefing template never reproduces the score in standalone form. |
| Processing leak — full transcript of an opposition politician shared externally | Briefings include only short transcript excerpts (≤600 chars). Full transcripts stay in the per-video drawer behind authenticated access. |

## Update cadence

This document is reviewed:
- Each EU electoral cycle.
- After any change to the rule engines (`backend/compliance/`).
- After any incident that triggers an audit-log review.

Last reviewed: hackathon submission.
