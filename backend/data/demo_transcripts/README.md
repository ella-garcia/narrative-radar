# Demo Transcripts

Use this directory for per-video demo transcript fixtures.

When adding a video to `backend/data/demo_videos.json`, either keep the
transcript inline with `transcript_segments` or point to a file here:

```json
{
  "video_id": "example-video-001",
  "url": "https://www.tiktok.com/@example/video/123",
  "platform": "tiktok",
  "title": "Example video",
  "author": "@example",
  "upload_date": "2026-04-18T12:00:00Z",
  "view_count": 1000,
  "duration_sec": 12,
  "language": "en",
  "hashtags": ["#example"],
  "description": "Local demo fixture.",
  "has_platform_ai_label": false,
  "transcript_path": "demo_transcripts/example-video-001.json",
  "demo_synthetic_likelihood": 0.1,
  "narrative_hint": "example"
}
```

The transcript file may be a JSON list:

```json
[
  {
    "start": 0.0,
    "end": 4.2,
    "speaker": "SPEAKER_00",
    "text": "First spoken segment."
  },
  {
    "start": 4.2,
    "end": 8.0,
    "speaker": "SPEAKER_00",
    "text": "Second spoken segment."
  }
]
```

It may also be an object with a top-level `segments` list:

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 4.2,
      "speaker": "SPEAKER_00",
      "text": "First spoken segment."
    }
  ]
}
```

The loader resolves paths relative to `backend/data` and rejects paths that
escape that directory.
