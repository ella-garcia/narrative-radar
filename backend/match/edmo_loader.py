"""Load and index the EDMO / EUvsDisinfo seed corpus."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import embeddings as emb

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@dataclass
class FactCheckEntry:
    factcheck_id: str
    title: str
    summary: str
    source: str
    source_url: str
    publication_date: str
    languages_documented: list[str]
    narrative_cluster: str
    keywords: list[str]
    example_claims: list[str] | None = None


def load_corpus() -> list[FactCheckEntry]:
    with (DATA_DIR / "seed_factchecks.json").open() as f:
        raw = json.load(f)
    return [FactCheckEntry(**r) for r in raw]


def index_corpus(corpus: list[FactCheckEntry]) -> np.ndarray:
    docs = []
    for e in corpus:
        examples = " ".join(e.example_claims or [])
        docs.append(
            f"{e.title}. {e.summary}. {' '.join(e.keywords)}. {examples}"
        )
    return emb.embed(docs)
