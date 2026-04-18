from datetime import datetime, timezone

import pytest

from backend.models import Platform, VideoMetadata
from backend.providers.base import ProviderNotConfigured, redact
from backend.providers.hive_provider import _headers, _synthetic_score
from backend.providers.tikapi_provider import _child, _items


def test_redact_removes_obvious_secrets():
    text = redact("authorization=sk-test1234567890 and token=abc12345678901234567890")
    assert "sk-test" not in text
    assert "abc12345678901234567890" not in text


def test_hive_synthetic_score_extracts_highest_relevant_class():
    payload = {
        "classes": [
            {"class": "not_ai", "score": 0.1},
            {"class": "ai_generated", "score": 0.92},
            {"class": "deepfake", "score": 0.71},
        ]
    }
    assert _synthetic_score(payload) == 0.92


def test_hive_headers_support_access_id_secret_key(monkeypatch):
    from backend.providers import hive_provider

    class DummySettings:
        hive_api_key = None
        hive_access_id = "access-id"
        hive_secret_key = "secret-key"
        hive_access_id_header = "X-Test-Access"
        hive_secret_key_header = "X-Test-Secret"
        hive_secret_key_scheme = ""

    monkeypatch.setattr(hive_provider, "SETTINGS", DummySettings())
    assert _headers() == {
        "X-Test-Access": "access-id",
        "X-Test-Secret": "secret-key",
    }


def test_hive_headers_preserve_legacy_token_mode(monkeypatch):
    from backend.providers import hive_provider

    class DummySettings:
        hive_api_key = "legacy-token"
        hive_access_id = None
        hive_secret_key = None

    monkeypatch.setattr(hive_provider, "SETTINGS", DummySettings())
    assert _headers() == {"Authorization": "Token legacy-token"}


def test_tikapi_item_parsing_supports_nested_payloads():
    assert _items({"data": {"videos": [{"id": "1"}]}}) == [{"id": "1"}]


def test_tikapi_child_mapping():
    child = _child(
        {
            "id": "123",
            "desc": "title",
            "createTime": 1700000000,
            "author": {"uniqueId": "creator"},
            "stats": {"playCount": 42},
            "textLanguage": "en",
        }
    )
    assert child.video_id == "123"
    assert child.author == "@creator"
    assert child.view_count == 42
    assert child.upload_date is not None


def test_youtube_provider_requires_key(monkeypatch):
    from backend.providers import youtube_provider

    class DummySettings:
        youtube_api_key = None

    monkeypatch.setattr(youtube_provider, "SETTINGS", DummySettings())
    with pytest.raises(ProviderNotConfigured):
        youtube_provider.videos_list(["x"])


def test_metadata_model_accepts_real_api_fields():
    metadata = VideoMetadata(
        video_id="1",
        url="https://www.tiktok.com/@x/video/1",
        platform=Platform.tiktok,
        title="t",
        author="@x",
        upload_date=datetime.now(tz=timezone.utc),
        view_count=1,
        language="en",
        audio_id="sound",
        audio_url="https://www.tiktok.com/music/sound",
        lineage_source_kind="audio",
        is_explicit_root_source=True,
    )
    assert metadata.audio_id == "sound"
