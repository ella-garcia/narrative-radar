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
    anthropic_api_key: str | None
    hive_api_key: str | None

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
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
        hive_api_key=os.environ.get("HIVE_API_KEY") or None,
    )


SETTINGS = load()
