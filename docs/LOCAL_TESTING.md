# Local Testing Framework

This guide defines the localhost testing process for Narrative Radar. It is
designed for demo-safe development: normal tests stay offline, localhost smoke
checks use pre-cached demo videos, and live provider calls are opt-in only.

## Test Layers

| Layer | Purpose | Command | Expected result |
|---|---|---|---|
| Unit and rule tests | Validate scoring, DSA/AI Act rules, provider fallbacks, matcher behavior, and pipeline fixtures. | `pytest` | All tests pass without network access or API keys. |
| Backend localhost smoke | Verify the FastAPI service, demo ingest, dashboard, briefing, storage, and RBAC responses through HTTP. | `scripts/local_smoke.sh` | Each checked endpoint returns its expected status code. |
| Frontend type/build check | Verify the React/Vite app compiles against the API types. | `cd frontend && npm run lint && npm run build` | TypeScript and Vite build complete. |
| Manual browser pass | Validate that core workflows work as an aide would use them. | Open `http://localhost:5173` | Ingest demo video, inspect feed/detail, dashboard, legal basis, audit/briefing views. |
| Live provider tests | Check optional external providers with real credentials and cost controls. | `LIVE_API_TESTS=1 pytest backend/tests/test_providers.py` | Only run deliberately, with keys and budget set. |

## One-Time Setup

From the repository root:

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd frontend
npm install
cd ..
```

The app runs without API keys by using deterministic demo data and fallback
logic. Add provider keys to `.env` only when explicitly testing live ingestion,
LLM extraction, briefing generation, OCR, lineage, or synthetic-media providers.

## Localhost Process

Use three terminals from the repository root.

Terminal 1: run offline tests before starting servers.

```bash
source .venv/bin/activate
pytest
```

Terminal 2: start the backend.

```bash
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 3: start the frontend.

```bash
cd frontend
npm run dev
```

Then run the localhost smoke suite from another shell:

```bash
scripts/local_smoke.sh
```

Useful overrides:

```bash
API_BASE=http://localhost:8001 scripts/local_smoke.sh
WEB_BASE=http://localhost:5174 scripts/local_smoke.sh
CHECK_FRONTEND=0 scripts/local_smoke.sh
```

## Smoke Coverage

`scripts/local_smoke.sh` checks:

- `GET /health` returns `200`.
- `GET /demo-videos` returns `200`.
- `DELETE /storage` returns `200`.
- `POST /ingest` accepts a pre-cached TikTok demo URL and returns `200`.
- `GET /videos` returns `200`.
- `GET /dashboard` returns `200`.
- `POST /briefing` returns `200`.
- `GET /audit` without `X-Role: dpo` returns `403`.
- `GET /audit` with `X-Role: dpo` returns `200`.
- `GET /videos/not-a-real-video-id` returns `404`.
- Frontend root returns a `2xx` or `3xx` status when `CHECK_FRONTEND=1`.

The smoke suite intentionally tests a few expected failures. A passing smoke
run does not mean every feature is complete; it means the local HTTP contract is
healthy enough for manual testing or a demo rehearsal.

## Manual Browser Checklist

Run this after the smoke suite:

1. Open `http://localhost:5173`.
2. Confirm the dashboard renders without console errors.
3. Ingest one of the built-in demo videos.
4. Confirm the new video appears in the feed.
5. Open the video detail drawer and check transcript, claims, fact-check match,
   compliance gaps, provider status, OCR, and lineage state.
6. Generate a briefing and confirm the cited articles and evidence pack match
   the selected video(s).
7. Clear storage and confirm the dashboard resets.
8. Repeat with at least one Romania case, one Doppelgänger case, and the
   AI-audio impersonation case.

## API Probes

These `curl` calls are useful when isolating failures:

```bash
curl -sS http://localhost:8000/health
curl -sS http://localhost:8000/demo-videos

curl -sS -X DELETE http://localhost:8000/storage

curl -sS -X POST http://localhost:8000/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-Actor: local-tester' \
  -H 'X-Role: aide' \
  -d '{"url":"https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045","constituency":"RO"}'

curl -sS http://localhost:8000/videos
curl -sS http://localhost:8000/dashboard
curl -sS -H 'X-Role: dpo' http://localhost:8000/audit
```

## Possible Errors And Reasons

| Symptom | Example response | Likely reason | Fix |
|---|---|---|---|
| Backend is unreachable | `curl: (7) Failed to connect to localhost port 8000` | Uvicorn is not running, crashed during reload, or is on a different port. | Start backend with `uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload`, or set `API_BASE`. |
| Frontend is unreachable | `Frontend http://localhost:5173 returned 000` | Vite is not running, started on another port, or the smoke check is running before Vite is ready. | Start `npm run dev`, use the printed Vite URL, or run `CHECK_FRONTEND=0 scripts/local_smoke.sh` for backend-only checks. |
| Ingest returns 400 for a real or unknown URL | `400 Bad Request: {"detail":"yt-dlp not installed and URL not in demo cache. Install yt-dlp or add the URL to backend/data/demo_videos.json."}` | The URL is not one of the pre-cached demo cases and metadata extraction is unavailable. | Install/configure `yt-dlp`, enable the relevant provider path, or add a deterministic fixture to `backend/data/demo_videos.json`. |
| Ingest returns 400 after metadata succeeds | `400 Bad Request: {"detail":"No pre-computed transcript for video_id=3_LtC4cLzbc and live transcription is not configured in this build."}` | Metadata was found, but the video is not in the demo transcript cache and live transcription is not configured or failed. | Use a demo URL, add inline `transcript_segments` to `backend/data/demo_videos.json`, add `transcript_path` pointing to `backend/data/demo_transcripts/<video_id>.json`, or configure live transcription with the required provider package and API key. |
| Demo transcript file is missing or invalid | `400 Bad Request: {"detail":"Demo transcript file not found for video_id=..."}` | A demo fixture has `transcript_path`, but the file does not exist, is invalid JSON, or lacks a segment list. | Add the file under `backend/data/demo_transcripts/` using a JSON segment list or `{"segments":[...]}` object. |
| Ingest returns a validation error | `422 Unprocessable Entity` | Request JSON is malformed or missing required fields, usually `url`. | Send `{"url":"..."}` with `Content-Type: application/json`. |
| Audit endpoint returns 403 | `{"detail":"Audit log read requires X-Role: dpo..."}` | `/audit` is intentionally gated by role header. | Add `-H 'X-Role: dpo'` for local DPO checks. |
| Video lookup returns 404 | `{"detail":"video_id=not-a-real-video-id not found"}` | The ID has not been ingested or storage was cleared. | Ingest the video again or list current IDs with `GET /videos`. |
| Provider status is `not_configured` | Response includes `"provider_statuses": {"hive": {"status": "not_configured"}}` | Optional provider credentials or SDKs are missing. | Add the provider key/package only when testing that provider. Offline demo paths do not require it. |
| OCR or media extraction is `failed` or `skipped` | Provider status mentions `ffmpeg`, `media_downloads`, or `easyocr`. | Local machine lacks optional binaries/packages, downloads are disabled, or media fetch failed. | Install the optional toolchain and set the relevant `.env` flags, or stay on demo fixtures. |
| Frontend API calls fail in browser | Browser console shows failed `/api/...` requests. | Backend is not on port `8000`, Vite proxy is stale, or the backend restarted mid-request. | Restart both servers. If using a non-default backend port, update the frontend proxy or run Vite with the expected target. |
| TypeScript build fails | `npm run lint` or `npm run build` reports type errors. | Backend/frontend schema changed without updating `frontend/src/lib/types.ts` or API handling. | Align frontend types and API rendering with the backend model. |

## Live Provider Guardrails

Live provider tests can cost money and depend on network availability. Keep them
out of normal local and CI runs unless explicitly needed.

```bash
LIVE_API_TESTS=1 LIVE_API_MAX_COST_USD=1.00 pytest backend/tests/test_providers.py
```

Before running live tests, confirm:

- Required API keys are present in `.env`.
- The test URL or media fixture is approved for provider use.
- The expected cost is below `LIVE_API_MAX_COST_USD`.
- Failures are recorded with provider status and request IDs when available.

## Pass Criteria

A local change is ready for review when:

- `pytest` passes.
- `scripts/local_smoke.sh` passes against localhost.
- `cd frontend && npm run lint && npm run build` passes for frontend-affecting changes.
- Manual browser checks pass for any touched workflow.
- New expected errors are documented in this file or covered by tests.
