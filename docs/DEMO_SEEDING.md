# Manual Demo Seed Database

This guide explains how to manually create demo seed data for video URLs,
metadata, OCR text, and transcripts without depending on live platform calls.
The app loads these fixtures from `backend/data/demo_videos.json` and, when
used, transcript files in `backend/data/demo_transcripts/`.

Use this flow when you want a localhost demo to work even if platform APIs,
yt-dlp, transcription providers, or external LLM calls are unavailable.

## Files

| File or directory | Purpose |
|---|---|
| `backend/data/demo_videos.json` | Main seed database. One JSON object per demo video URL. |
| `backend/data/demo_transcripts/` | Optional per-video transcript files referenced by `transcript_path`. |
| `backend/data/demo_transcripts/README.md` | Transcript-only format examples. |
| `backend/data/seed_factchecks.json` | External fact-check corpus used for matching claims. |
| `backend/data/dsa_tdb_seed.json` | DSA Transparency Database-style seed references. |

## Manual Workflow

1. Choose a stable `video_id`.

   Prefer a readable ID that will not change if the URL changes, for example
   `ro-election-demo-004` or `youtube-vdl-clip-001`. This is the primary key
   used by the transcript loader, storage, and tests.

2. Create the video metadata entry.

   Add a new object to the top-level array in `backend/data/demo_videos.json`.
   Keep valid JSON: comma between objects, double quotes, no comments.

3. Create the transcript file.

   Save it as `backend/data/demo_transcripts/<video_id>.json` and reference it
   from the metadata entry as:

   ```json
   "transcript_path": "demo_transcripts/<video_id>.json"
   ```

4. Add OCR blocks if text appears on screen.

   OCR blocks are optional, but important for meme, screenshot, subtitle, or
   article-preview videos. Add them inline in the metadata entry with
   `ocr_blocks`.

5. Add a `narrative_hint`.

   Use an existing narrative hint when you want videos to cluster together.
   Examples already in the seed data include `ro_election_2024`,
   `doppelganger_2024`, and `ai_generated_political_audio`.

6. Check matching support.

   The app only produces strong fact-check matches when claims resemble entries
   in `backend/data/seed_factchecks.json`. If your new demo represents a new
   narrative, add a corresponding fact-check seed there as a separate step.

7. Validate locally.

   ```bash
   source .venv/bin/activate
   pytest backend/tests/test_demo_transcripts.py backend/tests/test_pipeline_e2e.py
   pytest
   ```

8. Test through localhost.

   Start the backend and ingest your exact URL:

   ```bash
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   In another shell:

   ```bash
   curl -sS -X POST http://localhost:8000/ingest \
     -H 'Content-Type: application/json' \
     -d '{"url":"PASTE_THE_EXACT_URL_FROM_DEMO_VIDEOS_JSON"}'
   ```

## Required Metadata Fields

Every demo object needs these fields:

| Field | Type | Example | Notes |
|---|---|---|---|
| `video_id` | string | `"ro-election-demo-004"` | Stable unique ID. |
| `url` | string | `"https://www.tiktok.com/@account/video/123"` | Must exactly match the URL you will ingest. |
| `platform` | string | `"tiktok"` | One of `tiktok`, `youtube`, `youtube_shorts`, `instagram`, `twitter`, `other`. |
| `title` | string | `"Demo title"` | Human-readable title. |
| `author` | string | `"@account"` | Use platform handle when available. |
| `upload_date` | ISO datetime | `"2026-04-18T12:00:00Z"` | UTC is preferred. |
| `view_count` | integer | `125000` | Use `0` if unknown, but demos are more useful with realistic reach. |
| `language` | string | `"en"` | Two-letter language code when possible. |
| `has_platform_ai_label` | boolean | `false` | Whether the platform visibly labels the post as AI-generated/synthetic. |
| `transcript_path` or `transcript_segments` | string or array | `"demo_transcripts/ro-election-demo-004.json"` | Prefer `transcript_path` for new demos. |

## Optional Metadata Fields

| Field | Type | Example | Notes |
|---|---|---|---|
| `like_count` | integer | `4200` | Optional engagement signal. |
| `duration_sec` | number | `38` | Video duration in seconds. |
| `hashtags` | string array | `["#eu", "#election"]` | Include visible/caption hashtags. |
| `description` | string | `"Caption text"` | Platform caption or short description. |
| `audio_id` | string | `"sound-demo-2026"` | Use same value across related posts to demo lineage. |
| `audio_url` | string | `"https://www.tiktok.com/music/sound-demo-2026"` | Optional source URL for the audio. |
| `lineage_source_kind` | string | `"audio"` | Use `audio` when `audio_id` identifies shared sound. |
| `is_explicit_root_source` | boolean | `true` | Use only when platform metadata clearly marks original/source audio. |
| `ocr_blocks` | array | See template below. | Text overlays, screenshots, subtitles, or article titles. |
| `demo_synthetic_likelihood` | number | `0.18` | Demo-only score from `0.0` to `1.0`; does not by itself claim AI generation. |
| `narrative_hint` | string | `"doppelganger_2024"` | Helps demo clustering and readability. |

## Metadata Template

Copy this object into `backend/data/demo_videos.json` and edit the values.

```json
{
  "video_id": "manual-demo-001",
  "url": "https://www.tiktok.com/@example/video/1234567890",
  "platform": "tiktok",
  "title": "Short descriptive title",
  "author": "@example",
  "upload_date": "2026-04-18T12:00:00Z",
  "view_count": 100000,
  "like_count": 5000,
  "duration_sec": 35,
  "language": "en",
  "hashtags": ["#example", "#demo"],
  "description": "Caption or short description from the platform.",
  "audio_id": "sound-manual-demo-001",
  "audio_url": "https://www.tiktok.com/music/sound-manual-demo-001",
  "lineage_source_kind": "audio",
  "is_explicit_root_source": false,
  "has_platform_ai_label": false,
  "ocr_blocks": [
    {
      "text": "Visible on-screen text",
      "confidence": 0.95,
      "frame_sec": 4.0
    }
  ],
  "transcript_path": "demo_transcripts/manual-demo-001.json",
  "demo_synthetic_likelihood": 0.1,
  "narrative_hint": "manual_demo"
}
```

## Transcript Template

Save as `backend/data/demo_transcripts/manual-demo-001.json`.

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "speaker": "SPEAKER_00",
      "text": "First spoken sentence or subtitle line."
    },
    {
      "start": 5.0,
      "end": 10.5,
      "speaker": "SPEAKER_00",
      "text": "Second spoken sentence."
    }
  ]
}
```

Segment rules:

- `start` and `end` are seconds from the beginning of the video.
- `end` should be greater than `start`.
- `speaker` can be `SPEAKER_00`, `SPEAKER_01`, or `null` if unknown.
- `text` should contain the best human transcript, not a summary.
- Keep the transcript in the original spoken language. Add translation only in
  a separate note outside this fixture if needed.

## OCR Template

Add this optional array inside the video object in `demo_videos.json`:

```json
"ocr_blocks": [
  {
    "text": "ARTICLE HEADLINE SHOWN ON SCREEN",
    "confidence": 0.93,
    "frame_sec": 7.0
  },
  {
    "text": "Subtitle or caption shown later",
    "confidence": 0.88,
    "frame_sec": 18.5
  }
]
```

OCR rules:

- Use exact visible text when possible.
- `confidence` is a manual estimate from `0.0` to `1.0`; use `null` if unknown.
- `frame_sec` is the approximate timestamp where the text appears.
- Omit `ocr_blocks` when there is no meaningful text overlay.

## Seeding Related Videos

To demo coordinated spread or lineage:

- Give related videos the same `narrative_hint`.
- Give videos using the same sound the same `audio_id`.
- Use different `author` values for different accounts.
- Keep `upload_date` values within a seven-day window for DSA Art. 26 demos.
- Use at least three distinct accounts for the coordinated-spread signal.
- Use multiple `language` values when demonstrating cross-language spread.

## Quality Checklist

Before testing, confirm:

- The URL in `demo_videos.json` exactly matches the URL you paste into ingest.
- `video_id` is unique across the file.
- `upload_date` is valid ISO datetime.
- `platform` matches the allowed enum.
- `language` is a short language code.
- Transcript path exists and stays under `backend/data/demo_transcripts/`.
- Transcript JSON is valid.
- Every transcript segment has `start`, `end`, `speaker`, and `text`.
- The transcript is not empty.
- Any OCR text is evidence from the video, not analysis.
- New narratives have supporting entries in `seed_factchecks.json` if you need
  fact-check matching.

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| URL mismatch | Ingest tries live metadata instead of demo metadata. | Copy the exact `url` from the fixture into the UI or curl command. |
| Missing transcript file | `Demo transcript file not found for video_id=...` | Create the file named in `transcript_path`. |
| Invalid JSON | Backend fails during import or ingest. | Validate JSON with `python3 -m json.tool backend/data/demo_videos.json`. |
| New narrative has no fact-check match | Video ingests but has weak/no matches. | Add a relevant seed fact-check to `backend/data/seed_factchecks.json`. |
| Coordinated spread does not fire | No DSA Art. 26 gap appears. | Seed at least three accounts in the same narrative window. |
| AI Act Art. 50 does not fire | No AI-label gap appears. | Confirm `has_platform_ai_label` is `false` and synthetic likelihood is high enough for the intended demo. |

## Validation Commands

Run these from the repository root:

```bash
python3 -m json.tool backend/data/demo_videos.json >/tmp/demo_videos.validated.json
python3 -m json.tool backend/data/demo_transcripts/manual-demo-001.json >/tmp/manual-demo-001.validated.json
.venv/bin/pytest backend/tests/test_demo_transcripts.py backend/tests/test_pipeline_e2e.py
```

To test one seeded URL through the API:

```bash
curl -sS -X POST http://localhost:8000/ingest \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.tiktok.com/@example/video/1234567890"}'
```
