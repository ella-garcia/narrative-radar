import json

from backend.ingest import yt_dlp_wrapper
from backend.transcribe.whisperx_runner import transcribe_video


def test_demo_transcript_can_live_in_external_file(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    transcript_dir = data_dir / "demo_transcripts"
    transcript_dir.mkdir(parents=True)
    transcript_file = transcript_dir / "external-demo.json"
    transcript_file.write_text(
        json.dumps(
            {
                "segments": [
                    {
                        "start": 0.0,
                        "end": 2.5,
                        "speaker": "SPEAKER_00",
                        "text": "External transcript works.",
                    }
                ]
            }
        )
    )

    demo = {
        "video_id": "external-demo",
        "transcript_path": "demo_transcripts/external-demo.json",
    }

    monkeypatch.setattr(yt_dlp_wrapper, "DATA_DIR", data_dir)
    monkeypatch.setitem(yt_dlp_wrapper.DEMO_BY_ID, "external-demo", demo)
    try:
        transcript = transcribe_video("external-demo", "en")
    finally:
        yt_dlp_wrapper.DEMO_BY_ID.pop("external-demo", None)

    assert transcript.full_text == "External transcript works."
    assert transcript.segments[0]["speaker"] == "SPEAKER_00"


def test_demo_transcript_rejects_paths_outside_data_dir():
    demo = {
        "video_id": "unsafe-demo",
        "transcript_path": "../secrets.json",
    }

    try:
        yt_dlp_wrapper.demo_transcript_segments(demo)
    except RuntimeError as exc:
        assert "escapes backend/data" in str(exc)
    else:
        raise AssertionError("Expected path traversal guard to reject transcript_path")
