# Narrative Radar

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**AI-powered DSA & AI Act compliance-gap monitoring for parliamentary offices.**

EU AI Hackathon 2026, Topic C — *AI, Disinformation & Democratic Integrity*.

> *We don't tell politicians what to think. We show what platforms aren't doing — and what the law already requires them to do.*

---

## What it does

Paste a TikTok / YouTube Shorts / Instagram / X URL → Narrative Radar:

1. **Ingests** real platform metadata (yt-dlp).
2. **Transcribes** with Whisper / WhisperX (multilingual, diarised).
3. **Extracts factual claims** with GPT-4o (categories: election, military, EU institutions, …).
4. **Matches** semantically against a real EDMO / EUvsDisinfo fact-check corpus (FAISS-style cosine search).
5. **Detects three classes of EU compliance-gap indicator**:
   - **AI Act Art. 50 — disclosure-label audit**: when a video carries reasonable indicators of AI involvement but the platform has not surfaced the legally required label. *We never claim a video is AI-generated.*
   - **DSA Art. 34-35 — systemic risk**: when the content matches a documented EDMO narrative AND the platform's own DSA Transparency Database filings show it has acted on similar claims elsewhere. *Backed by the platform's own admissions.*
   - **DSA Art. 26 — coordinated cross-language spread**: when ≥3 distinct accounts post the same narrative within a 7-day window, elevated to *high* when ≥2 languages span. *This is the wow signal — it lights up on the Doppelgänger demo case.*
6. **Enriches lineage / derivative spread** for demo cases, including reused audio, derivative-video samples, aggregate reach, and a drill-down that separates native reach from cross-platform spread.
7. **Scores severity** (0–100 = log-reach × recency-decay × match-signal).
8. **Supports human-gated review** in the evidence modal: approve an item, remove approval, or send it back for additional review with an audit trail.
9. **Generates a parliamentary briefing** — an EU-styled, printable two-page document with executive summary, findings, cited articles with EUR-Lex links, and an evidence pack.

## What it is NOT

- **Not a deepfake or AI-content detector.** Synthetic-media likelihood is shown as metadata only and never gates a compliance gap on its own.
- **Not a "disinformation classifier."** We match against external EDMO / EUvsDisinfo determinations — we don't make truth calls.
- **Not an automated takedown tool.** Output is briefings; humans decide.
- **Not a replacement for fact-checkers.** We amplify their reach into political offices.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| Embeddings & search | sentence-transformers / FAISS (mpnet) — with a deterministic hash-TF-IDF fallback so the demo runs out of the box with **zero ML downloads** |
| LLM | OpenAI GPT-4o (claim extraction), Anthropic Claude (briefing) — both with deterministic fallback paths |
| Ingestion | yt-dlp (with pre-cached demo cases) |
| Frontend | React 18 + TypeScript + Vite + Tailwind + Recharts + react-router |
| Storage | SQLite-style JSON sidecars (single-process, hackathon-scale) |
| Tests | 48 pytest tests covering severity scoring, DSA rule engines (Art. 26 / 34-35 / 50), matcher, provider fallbacks, audit, and end-to-end pipeline |

## Quick start

```bash
# 0. Optional — copy the env template. The app runs without any API keys
#    via deterministic fallbacks; set keys to upgrade each stage.
cp .env.example .env

# 1. Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
pytest                                              # 48 passed
uvicorn backend.main:app --port 8000 --reload

# 2. Frontend (in a second shell)
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

The frontend proxies `/api` to `http://localhost:8000`, so you can develop both without CORS friction.

### Local testing

Use the full local test playbook in [`docs/LOCAL_TESTING.md`](docs/LOCAL_TESTING.md).
The short path is:

```bash
pytest
uvicorn backend.main:app --port 8000 --reload
cd frontend && npm run dev
# in another shell from the repo root
scripts/local_smoke.sh
```

The smoke script checks the localhost API contract, expected auth/error
responses, a demo ingest, briefing generation, and the Vite root page.

To manually add offline demo URLs, metadata, OCR, and transcripts, use
[`docs/DEMO_SEEDING.md`](docs/DEMO_SEEDING.md).

## Product workflow

The frontend is organized around a dashboard, video feed, evidence modal,
legal-basis reference page, briefing generator, and audit log.

- **Narrative cluster map**: summarizes active narrative clusters by language
  span, max severity, and total native reach. The overview intentionally stays
  compact so it remains scannable during a demo.
- **Evidence modal**: clicking a video opens a centered preview modal that can
  expand to full screen. The modal contains compliance gaps, derivative spread,
  extracted claims, OCR, fact-check matches, DSA TDB cross-references,
  transcript, provenance, and metadata.
- **Derivative spread drill-down**: when lineage enrichment is complete, the
  modal shows derivative-video count, aggregate spread, root-proof status, and
  a reach breakdown: native video reach, cross-platform spread, and combined
  reach.
- **Human review actions**: review buttons live inside the modal under
  **User Actions**. A reviewer can approve an item, remove approval, or mark it
  as **Sent for Additional Review**. These changes are persisted and recorded in
  the audit log.
- **Briefing generation**: reviewers can generate a parliamentary briefing from
  the modal or briefing page after inspecting the evidence.

### In VSCode / Cursor

The repo ships `.vscode/launch.json` — open the project, press **F5**, pick
**"Full stack (backend + frontend)"** to start both servers in one shot.
Recommended extensions auto-prompt on first open.

To upgrade matching quality, install sentence-transformers and call
`use_sentence_transformers()` once at startup; the threshold auto-adjusts via
`config.py`.

## Demo cases (pre-cached, no network required)

| Case | Why it matters |
|---|---|
| Romania 2024 — Călin Georgescu / TikTok (3 videos) | The annulled Romanian presidential election. Lights up DSA Art. 34-35 with a TikTok DSA TDB cross-reference of 124,583 actions on `ELECTORAL_INTEGRITY_RO`. |
| Doppelgänger campaign (4 videos: FR / DE / PL / IT) | Cross-language Russian impersonation operation. Lights up DSA Art. 26 *high-severity, cross-language* — backed by Meta's own published Adversarial Threat Reports. |
| AI-audio impersonation of Ursula von der Leyen | Lights up AI Act Art. 50 because the platform never surfaced the AI-disclosure label. |
| Climate-hoax Green Deal cluster (2 videos: IT / ES) | Shows a small derivative spread radius: shared audio, low-to-medium aggregate reach, and climate-denial fact-check matching. |
| EU conscription cluster (3 videos: PL / DE / RO) | Shows a medium derivative spread radius across three accounts and languages, mapped to the EU militarisation narrative. |
| Digital euro surveillance cluster (3 videos: IT / EN / FR) | Shows a higher-reach derivative spread radius around the CBDC surveillance/control narrative. |

Each case is real-world grounded in publicly documented incidents (EUvsDisinfo, EDMO, EC press release IP/24/6487, Correctiv, Viginum, Pagella Politica, Demagog).

## Repo layout

```
backend/
  main.py                        # FastAPI app — API endpoints
  pipeline.py                    # URL → AnalyzedVideo orchestrator
  models.py                      # Pydantic wire schema (frontend ↔ backend)
  config.py
  storage.py                     # JSON-sidecar store
  legal_refs.json                # DSA + AI Act article texts + EUR-Lex links
  ingest/yt_dlp_wrapper.py
  transcribe/whisperx_runner.py  # ships pre-cached transcripts
  claims/gpt4o_extractor.py      # GPT-4o + multilingual fallback
  match/embeddings.py            # mpnet + hash-TF-IDF fallback
  match/edmo_loader.py
  match/matcher.py
  scoring/severity.py
  compliance/art50_ai.py         # AI Act disclosure audit
  compliance/art34_dsa.py        # systemic risk + DSA TDB cross-ref ★ wow
  compliance/art26_coord.py      # cross-language coordinated spread
  briefing/claude_brief.py
  data/
    seed_factchecks.json         # ~22 real EDMO / EUvsDisinfo cases
    demo_videos.json             # 16 pre-cached demo videos
    demo_transcripts/            # optional per-video demo transcripts
    dsa_tdb_seed.json            # subset of EU DSA Transparency DB
  tests/                         # 48 tests — severity, rules, matcher, audit, e2e
frontend/
  src/pages/                     # Dashboard, Feed, Briefing, LegalBasis
  src/components/                # VideoCard, SeverityMeter, ViolationBadge,
                                 #   IngestBar, ClusterMap, VideoDetailDrawer,
                                 #   Layout, Logo
docs/                            # MODEL_CARD, GOVERNANCE, DEPLOYMENT,
                                 #   DSA_COMPLAINT_TEMPLATE, LIMITATIONS
DEMO_SCRIPT.md                   # the 5-minute pitch + judge Q&A prep
```

## Acknowledgements

Built on the work of EDMO and its hub network (CEDMO, GADMO, BENEDMO, NORDIS, IBERIFIER, ADMO, MedDMO, BROD), EUvsDisinfo / EEAS, the Commission's DSA Transparency Database, Funky Citizens, Correctiv, Viginum, Pagella Politica, Demagog, Maldita.es, and AFP Fact Check. We do not represent any of these organisations; we cite their published determinations.

See `docs/LIMITATIONS.md` for what this prototype intentionally does not do.
