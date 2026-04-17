# Limitations & Known Issues

We are loud about what this prototype does *not* do. Honesty here is a competitive advantage, not a weakness.

## What we don't claim to do

- **We do not detect deepfakes or AI-generated content.** Synthetic-media likelihood is a metadata-only enrichment field. Even when it is present, the system requires a *separate* indicator before raising the AI Act Art. 50 disclosure-labelling gap. Production-grade detection is a different, harder problem served by Hive, Reality Defender, TrueMedia.org, DeepFake-O-Meter, and the academic literature.
- **We do not classify content as "disinformation".** We surface matches against external EDMO / EUvsDisinfo determinations made by accredited fact-checkers.
- **We do not file complaints, removals, or enforcement actions.** Output is briefings, humans decide.
- **We do not host platform users at scale.** Single-tenant per parliamentary office.
- **We are not a real-time alerting system.** Production should add a streaming pipeline; the prototype is request-driven.

## Known weaknesses in this prototype

- **TikTok ingestion** depends on `yt-dlp`. TikTok's Research API requires academic accreditation and is currently subject to an EC investigation; we do not pursue it. The prototype ships with pre-cached demo cases so live ingestion is not on the critical demo path.

- **Embedding fallback.** The default build uses a deterministic hash + TF-IDF embedding so the demo runs with zero ML downloads. Recall on paraphrased and cross-language claims is materially worse than `all-mpnet-base-v2`. The threshold auto-adjusts (`config.py: edmo_match_threshold_*`). Production should always run `sentence-transformers`.

- **EDMO / EUvsDisinfo corpus** is a 22-entry hand-curated seed at hackathon scale. Production should index the full EUvsDisinfo dataset (6,500+ cases) plus the EDMO hub fact-checks.

- **DSA Transparency Database integration** is currently a static seed (`backend/data/dsa_tdb_seed.json`) covering the platforms and decision grounds for the demo cases. Production should pull the daily parquet bulk download and index aggregates per `(platform, decision_ground, time_window)`.

- **Cluster assignment is via best-EDMO-match.** Production should run HDBSCAN on embeddings to discover narrative clusters bottom-up.

- **No deduplication** of repeated re-uploads or near-duplicate variants. Two identical videos produce two analyses.

- **Multilingual accuracy degradation.** Whisper and GPT-4o quality drop on Russian, Ukrainian, Belarusian, Bulgarian, Serbian, Romanian, and Chinese content. The system flags `confidence: low/medium` and renders a mandatory "human review required" UI warning. False-positive risk is highest in these languages.

- **AI Act Art. 50 audit.** The Art. 50 enforcement date is 2 August 2026; before that date, indicators of disclosure-labelling failure are best read as preparatory diligence rather than current legal non-compliance.

- **Briefings via Claude.** Claude Sonnet 4.6 is used for the executive summary when an API key is provided; otherwise a deterministic template is used. The template is more conservative than the LLM output but contains less narrative voice.

- **No constituency picker UI complexity.** The constituency banner is a single-select dropdown; production should support multi-MEP / multi-region offices.

- **Audit log is not implemented in the prototype.** `GOVERNANCE.md` documents what production should log; the prototype writes only the analysed-videos JSON sidecar.

- **No write API for filed complaints.** `DSA_COMPLAINT_TEMPLATE.md` is an offline template; it is intentionally not auto-filed.

## Things we considered and rejected

- **Open-source AI-text detection** (Ghostbuster / Binoculars). The 2024–2026 literature shows these are unreliable on short, paraphrased, or non-native text. Adding an unreliable detector creates a false-confidence signal that contradicts the Art. 50 framing.
- **Bot/coordinated-behaviour detection libraries.** Botometer is research-only; no mature OSS replacement exists. Production should build heuristics from scratch (timestamp entropy + hashtag overlap + reply-graph density).
- **Auto-takedown integrations** (DSA notice-and-action APIs). Out of scope; would conflict with the human-in-the-loop principle.

## Roadmap (if this becomes more than a hackathon)

Short-term (1–3 months):
- Sentence-transformers as default; ship pre-built FAISS index in container image.
- Full EDMO + EUvsDisinfo corpus ingestion.
- Daily DSA Transparency Database sync + per-platform aggregate pre-compute.
- HDBSCAN clustering on embeddings.
- Audit-log plumbing per `GOVERNANCE.md` spec.

Medium-term (3–6 months):
- Multi-platform expansion: Instagram Reels, YouTube Shorts, Telegram channels.
- Real-time WebSocket alerts for rapidly-spreading content.
- Reach-trend charts (narrative velocity over time).
- EDMO partnership for live fact-check feed integration.

Long-term:
- Cross-lingual claim matching at production accuracy.
- Electoral-event calendar integration for heightened monitoring windows.
- API for integration with parliamentary information systems.
