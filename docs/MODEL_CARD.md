# Model Card — Narrative Radar

## Overview

Narrative Radar is a **decision-support pipeline**, not a single ML model. It composes off-the-shelf models (Whisper / GPT-4o / Claude / sentence-transformers / optional Hive) with deterministic rule engines that map model outputs to indicators of potential platform obligation failures under EU law.

This card documents the system as a whole: what it is meant to do, what it is *not* meant to do, where it is known to be weak, and how human reviewers should interpret its outputs.

## Intended use

- **Primary user**: parliamentary aides, MP advisors, national-regulator staff, EDMO-affiliated fact-checking organisations.
- **Primary purpose**: surface short-form video items whose pattern of (a) factual claims, (b) match to documented disinformation narratives, and (c) the platform's own DSA Transparency Database filings together suggest a potential gap in platform compliance with the DSA or AI Act.
- **Outputs are indicators**, not findings. They are inputs to human investigation and qualified legal review, not enforcement actions.
- The system is intended to **augment, not replace**, EDMO and its member fact-checking organisations.

## Out-of-scope use

- **Not for content moderation or removal decisions.** Narrative Radar must never be used to gate publication, removal, demotion, or labelling of any specific piece of content.
- **Not for individual targeting.** It must not be used to investigate, profile, or build dossiers on individual social-media users.
- **Not for ad-hoc deepfake-detection claims.** The synthetic-media likelihood is a metadata field only; making a public assertion that a specific video is AI-generated requires forensic review with dedicated tools.
- **Not for assertions about specific elections being illegitimate.** The Romania 2024 case is documented as the canonical reference because the *Romanian Constitutional Court itself* annulled the round and the *European Commission* opened DSA proceedings against TikTok. Narrative Radar reports those public determinations; it does not originate them.

## Components

| Stage | Component | Provider | Versions tested |
|---|---|---|---|
| Ingestion | yt-dlp | OSS (Unlicense) | 2024.x – 2026.x |
| Transcription | Whisper / WhisperX (large-v3 on GPU; medium fallback on CPU) | OpenAI / OSS (BSD-2) | latest |
| Claim extraction | GPT-4o-mini, JSON mode | OpenAI | gpt-4o-mini-2024-07-18 |
| Embeddings | sentence-transformers `all-mpnet-base-v2` | OSS (Apache-2) | 3.x. Hash-TF-IDF fallback when not installed. |
| Vector search | FAISS `IndexFlatIP` | OSS (MIT) | 1.x. Pure-numpy fallback at hackathon scale. |
| Synthetic-media metadata (optional) | Hive Moderation | proprietary | API v2 |
| Briefing generation | Claude Sonnet 4.6 | Anthropic | claude-sonnet-4-6 |
| Compliance rule engines | Custom Python rules in `backend/compliance/` | This project | this commit |

## Training data

**None.** Narrative Radar trains no model. All ML components are used off-the-shelf via API or pre-trained checkpoints. The pipeline composes their outputs with deterministic rules and a curated reference corpus.

The reference corpus is a hand-curated subset of public EDMO and EUvsDisinfo determinations (~22 cases at hackathon scale; production deployment would index the full corpus). Each entry carries the original publishing organisation, publication date, source URL, and the documented narrative cluster.

## Evaluation

Hackathon-scope evaluation:

- **Functional pipeline**: 23 pytest tests covering severity scoring (4), DSA rule engines (12), matcher behaviour (4), and end-to-end pipeline against the 8 demo videos (3). All pass.
- **Demo-grade retrieval**: each of the three Romania URLs and four Doppelgänger URLs successfully retrieves the intended narrative cluster on the seed corpus.
- **No formal precision/recall study at hackathon scale.** A production deployment would require offline evaluation against held-out EDMO cases, calibrated per language pair.

## Known limitations

- **Multilingual accuracy degradation.** GPT-4o claim extraction quality is reduced for Eastern-European, Russian, Ukrainian, and Chinese content. The system flags `confidence: low` for `ru/uk/be/zh` and `confidence: medium` for `bg/sr/ro`. The frontend renders a mandatory "human review required" warning in those cases.
- **Hash-TF-IDF fallback** loses semantic recall on paraphrased claims and on cross-language matching. Production deployments must use sentence-transformers `all-mpnet-base-v2` or better.
- **Synthetic-media likelihood is only a hint.** Hive's third-party score is shown as metadata. Even when the score is very high, the system requires a *separate* indicator (uploader-declared / hashtag / EDMO match flagged as AI-audio) before firing the AI Act Art. 50 disclosure-audit gap.
- **DSA Transparency Database seed is a snapshot.** A production system would query the live API daily and pre-compute aggregates per platform / decision-ground / time-window.
- **Cluster assignment in this build is via best-EDMO-match.** Production should run HDBSCAN on embeddings to discover clusters bottom-up.
- **No deduplication** of repeated re-uploads. Two identical videos will produce two analyses.

## Governance and human oversight

- Every compliance gap carries a hard-coded disclaimer: *"Indicator for investigation only. Does not constitute a legal determination of non-compliance."* The disclaimer cannot be suppressed via configuration.
- Every briefing carries the same disclaimer in its footer.
- The `Generate briefing` action requires explicit user input; nothing is sent or filed automatically.
- Low-confidence languages trigger a UI warning in both the per-video drawer and the video-card list view.

## Maintenance & lifecycle

- The reference corpus must be refreshed at least monthly to track new EDMO publications.
- The DSA Transparency Database snapshot must be refreshed at least weekly.
- Rule thresholds (`config.py`) must be reviewed each EU electoral cycle.
- This card must be revised whenever any model, rule, or data source is changed.

## Contact

Hackathon prototype — no operating organisation. For any production deployment, attach the operating institution's data-protection officer and a named legal counsel.
