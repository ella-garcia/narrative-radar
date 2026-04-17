"""Embedding provider with two backends:

  1. sentence-transformers (`all-mpnet-base-v2`) when installed and chosen.
  2. A lightweight, deterministic TF-IDF + hash-vector fallback that works
     without any ML download — sufficient for the 22-entry seed corpus and the
     8 demo videos. Cosine-similarity ordering is preserved well enough for
     the demo and for unit tests.

The fallback is intentionally explicit so the demo runs out of the box. To
upgrade to mpnet at any point, install sentence-transformers and call
`use_sentence_transformers()` once at startup.
"""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from typing import Iterable

import numpy as np

_DIM = 384  # match small mpnet variants for shape compatibility


_provider: str = "hash_tfidf"
_st_model = None  # late-loaded sentence-transformers model


def use_sentence_transformers(model_name: str = "all-mpnet-base-v2") -> None:
    global _provider, _st_model, _DIM
    from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]

    _st_model = SentenceTransformer(model_name)
    _DIM = _st_model.get_sentence_embedding_dimension()
    _provider = "sentence_transformers"


def provider() -> str:
    return _provider


def dim() -> int:
    return _DIM


# -----------------------------------------------------------------------------
# Hash + TF fallback
# -----------------------------------------------------------------------------

_TOKEN_RE = re.compile(r"[^\W\d_]+", re.UNICODE)
_STOPWORDS = {
    "the", "a", "an", "of", "to", "in", "and", "or", "for", "on", "is", "it",
    "that", "this", "these", "those", "with", "are", "as", "be", "by", "at",
    "we", "you", "they", "i", "he", "she", "him", "her", "their", "our",
    "le", "la", "les", "un", "une", "des", "et", "à", "de", "du", "que",
    "der", "die", "das", "und", "ist", "in", "den", "ein", "eine", "es",
    "el", "los", "y", "del", "que", "es", "en", "se",
    "il", "lo", "la", "i", "del", "della", "che", "è", "in",
    "ne", "se", "într", "din", "pe", "cu", "sau", "la", "şi", "și",
    "ze", "i", "się", "do", "na", "z", "to", "w",
}


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text) if len(t) >= 3 and t.lower() not in _STOPWORDS]


def _hash_index(token: str, dim: int) -> int:
    h = hashlib.md5(token.encode("utf-8")).digest()
    return int.from_bytes(h[:4], "little") % dim


def _embed_hash_tfidf_one(text: str) -> np.ndarray:
    tokens = _tokens(text)
    if not tokens:
        return np.zeros(_DIM, dtype=np.float32)
    counts = Counter(tokens)
    vec = np.zeros(_DIM, dtype=np.float32)
    for tok, c in counts.items():
        idx = _hash_index(tok, _DIM)
        sign = 1.0 if (hash(tok) & 1) == 0 else -1.0
        vec[idx] += sign * (1.0 + math.log(c))
    n = float(np.linalg.norm(vec))
    if n > 0:
        vec /= n
    return vec


def embed(texts: Iterable[str]) -> np.ndarray:
    texts = list(texts)
    if _provider == "sentence_transformers" and _st_model is not None:
        arr = _st_model.encode(texts, normalize_embeddings=True)
        return np.asarray(arr, dtype=np.float32)
    if not texts:
        return np.zeros((0, _DIM), dtype=np.float32)
    return np.stack([_embed_hash_tfidf_one(t) for t in texts])
