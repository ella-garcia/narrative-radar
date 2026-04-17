"""Cosine-similarity matcher between extracted claims and the EDMO corpus.

Uses FAISS when installed, otherwise pure numpy. For our seed-corpus scale
(~100s of entries) the numpy path is fast enough and ships with no extra deps.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..config import SETTINGS
from ..models import Claim, FactCheckMatch
from . import embeddings as emb
from .edmo_loader import FactCheckEntry, index_corpus, load_corpus


@dataclass
class _Index:
    corpus: list[FactCheckEntry]
    matrix: np.ndarray  # (N, dim), L2-normalised

    def search(self, query: np.ndarray, top_k: int = 3) -> list[tuple[int, float]]:
        # query: (Q, dim) normalised; matrix: (N, dim) normalised → cosine == dot
        if self.matrix.shape[0] == 0:
            return []
        sims = query @ self.matrix.T  # (Q, N)
        agg = sims.max(axis=0) if sims.ndim == 2 else sims
        order = np.argsort(-agg)
        return [(int(i), float(agg[i])) for i in order[:top_k]]


_INDEX: _Index | None = None


def get_index() -> _Index:
    global _INDEX
    if _INDEX is None:
        corpus = load_corpus()
        matrix = index_corpus(corpus)
        _INDEX = _Index(corpus=corpus, matrix=matrix)
    return _INDEX


def _default_threshold() -> float:
    if emb.provider() == "sentence_transformers":
        return SETTINGS.edmo_match_threshold_mpnet
    return SETTINGS.edmo_match_threshold_hash_tfidf


def match_claims(
    claims: list[Claim], threshold: float | None = None, top_k: int = 3
) -> list[FactCheckMatch]:
    if not claims:
        return []
    threshold = threshold if threshold is not None else _default_threshold()
    idx = get_index()
    qvecs = emb.embed([c.text for c in claims])
    hits = idx.search(qvecs, top_k=top_k)

    out: list[FactCheckMatch] = []
    for ci, sim in hits:
        if sim < threshold:
            continue
        e = idx.corpus[ci]
        out.append(
            FactCheckMatch(
                factcheck_id=e.factcheck_id,
                title=e.title,
                summary=e.summary,
                source=e.source,
                source_url=e.source_url,
                publication_date=e.publication_date,
                languages_documented=e.languages_documented,
                similarity=round(sim, 4),
            )
        )
    return out


def best_cluster(claims: list[Claim]) -> tuple[str | None, float]:
    """Return (narrative_cluster_id, similarity) for the best EDMO match."""
    if not claims:
        return None, 0.0
    idx = get_index()
    qvecs = emb.embed([c.text for c in claims])
    hits = idx.search(qvecs, top_k=1)
    if not hits:
        return None, 0.0
    ci, sim = hits[0]
    return idx.corpus[ci].narrative_cluster, sim
