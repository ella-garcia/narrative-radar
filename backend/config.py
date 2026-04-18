"""Runtime configuration. Reads .env if present; otherwise uses safe defaults
that let the app run end-to-end in demo mode without external API keys."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_claim_model: str
    openai_transcribe_model: str
    anthropic_api_key: str | None
    anthropic_briefing_model: str
    hive_api_key: str | None
    hive_access_id: str | None
    hive_secret_key: str | None
    hive_api_base_url: str
    hive_access_id_header: str
    hive_secret_key_header: str
    hive_secret_key_scheme: str
    tikapi_key: str | None
    youtube_api_key: str | None
    enable_media_downloads: bool
    media_tmp_dir: Path
    live_api_tests: bool
    live_api_max_cost_usd: float

    # Match threshold for FAISS / cosine similarity (0..1).
    # Values are calibrated per embedding provider since absolute cosine
    # values are not comparable across embedding spaces.
    edmo_match_threshold_mpnet: float = 0.72
    edmo_match_threshold_hash_tfidf: float = 0.18

    # AI Act Art. 50 — third-party synthetic-media likelihood threshold for
    # firing the disclosure-audit indicator (only counted when AI Act label is
    # absent on the platform).
    art50_synthetic_likelihood_threshold: float = 0.85

    # DSA Art. 26 — minimum distinct accounts in a 7-day window to flag
    # coordinated spread.
    art26_min_accounts: int = 3
    art26_window_days: int = 7

    # Severity scoring weights (must sum to 1.0)
    severity_w_reach: float = 0.45
    severity_w_recency: float = 0.35
    severity_w_signal: float = 0.20
    severity_recency_halflife_days: float = 14.0
    severity_root_multiplier: float = 1.5
    severity_lineage_critical_floor_count: int = 25
    severity_lineage_critical_floor_reach: int = 1_000_000
    lineage_match_trigger_threshold: float = 0.40
    lineage_max_derivatives: int = 50
    ocr_enabled: bool = True


def load() -> Settings:
    return Settings(
        openai_api_key=os.environ.get("OPENAI_API_KEY") or None,
        openai_claim_model=os.environ.get("OPENAI_CLAIM_MODEL", "gpt-4o-mini"),
        openai_transcribe_model=os.environ.get(
            "OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe"
        ),
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
        anthropic_briefing_model=os.environ.get(
            "ANTHROPIC_BRIEFING_MODEL", "claude-sonnet-4-0"
        ),
        hive_api_key=os.environ.get("HIVE_API_KEY") or None,
        hive_access_id=os.environ.get("HIVE_ACCESS_ID") or None,
        hive_secret_key=os.environ.get("HIVE_SECRET_KEY") or None,
        hive_api_base_url=os.environ.get(
            "HIVE_API_BASE_URL",
            "https://api.thehive.ai/api/v3/task/sync",
        ),
        hive_access_id_header=os.environ.get(
            "HIVE_ACCESS_ID_HEADER", "X-Hive-Access-ID"
        ),
        hive_secret_key_header=os.environ.get(
            "HIVE_SECRET_KEY_HEADER", "Authorization"
        ),
        hive_secret_key_scheme=os.environ.get("HIVE_SECRET_KEY_SCHEME", "Bearer"),
        tikapi_key=os.environ.get("TIKAPI_KEY") or None,
        youtube_api_key=os.environ.get("YOUTUBE_API_KEY") or None,
        enable_media_downloads=(
            os.environ.get("ENABLE_MEDIA_DOWNLOADS", "").lower()
            in {"1", "true", "yes", "on"}
        ),
        media_tmp_dir=Path(os.environ.get("MEDIA_TMP_DIR", "/tmp/narrative-radar-media")),
        live_api_tests=(
            os.environ.get("LIVE_API_TESTS", "").lower()
            in {"1", "true", "yes", "on"}
        ),
        live_api_max_cost_usd=float(os.environ.get("LIVE_API_MAX_COST_USD", "1.00")),
    )


SETTINGS = load()


def live_provider_calls_allowed() -> bool:
    """Keep normal tests offline even when developer machines have API keys."""
    if SETTINGS.live_api_tests:
        return True
    return "PYTEST_CURRENT_TEST" not in os.environ
