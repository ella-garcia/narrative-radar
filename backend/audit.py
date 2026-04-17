"""Append-only audit log.

Implements the spec in `docs/GOVERNANCE.md` §Audit trail. Every state-changing
operation in the API (ingest, briefing generation, evidence export, threshold
change, corpus update, storage clear) writes one event line to a JSONL file.

The store is intentionally simple:
  - append-only on disk (`data/audit_log.jsonl`)
  - one record per line; records are JSON objects
  - each record carries a SHA-256 chain over (prev_hash, this_record) so a
    reviewer can verify that the log has not been tampered with after the fact
  - in-process lock for write atomicity

Read access is gated by an `X-Role: dpo` header at the API layer (see main.py).
This is a hackathon-grade gate — production must replace it with the operating
institution's real SSO + RBAC.
"""

from __future__ import annotations

import hashlib
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

DATA_DIR = Path(__file__).resolve().parent / "data"
LOG_FILE = DATA_DIR / "audit_log.jsonl"

_LOCK = threading.Lock()
_GENESIS = "sha256:0000000000000000"  # empty-chain placeholder


# -----------------------------------------------------------------------------
# Read
# -----------------------------------------------------------------------------


def read_all() -> list[dict[str, Any]]:
    if not LOG_FILE.exists():
        return []
    with LOG_FILE.open("r", encoding="utf-8") as f:
        out: list[dict[str, Any]] = []
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                # Skip rather than crash the API on a single bad line.
                continue
        return out


def verify_chain() -> dict[str, Any]:
    """Recompute the hash chain. Useful for the DPO view to display a tamper
    indicator next to the log."""
    records = read_all()
    expected_prev = _GENESIS
    breaks: list[int] = []
    for i, r in enumerate(records):
        if r.get("prev_hash") != expected_prev:
            breaks.append(i)
        recomputed = _hash_record(r.get("prev_hash", _GENESIS), _payload_only(r))
        if r.get("entry_hash") != recomputed:
            breaks.append(i)
        expected_prev = r.get("entry_hash", _GENESIS)
    return {
        "total_records": len(records),
        "intact": not breaks,
        "broken_indices": breaks,
        "head_hash": expected_prev,
    }


# -----------------------------------------------------------------------------
# Write
# -----------------------------------------------------------------------------


def log(
    *,
    actor: str,
    role: str,
    action: str,
    detail: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Append one audit event. Returns the written record (with hashes)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "actor": actor or "anonymous",
        "role": role or "anonymous",
        "action": action,
        "detail": detail or {},
    }
    with _LOCK:
        prev_hash = _last_hash()
        entry_hash = _hash_record(prev_hash, payload)
        record = {**payload, "prev_hash": prev_hash, "entry_hash": entry_hash}
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record


# -----------------------------------------------------------------------------
# Internals
# -----------------------------------------------------------------------------


def _last_hash() -> str:
    """Cheap-ish: read the file once and grab the final entry_hash. The log is
    small at hackathon scale; production would keep this in a sidecar."""
    if not LOG_FILE.exists():
        return _GENESIS
    last = ""
    with LOG_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                last = line
    if not last:
        return _GENESIS
    try:
        return json.loads(last).get("entry_hash", _GENESIS)
    except json.JSONDecodeError:
        return _GENESIS


def _payload_only(record: dict[str, Any]) -> dict[str, Any]:
    return {k: record[k] for k in ("timestamp", "actor", "role", "action", "detail") if k in record}


def _hash_record(prev_hash: str, payload: dict[str, Any]) -> str:
    canonical = json.dumps(
        {"prev_hash": prev_hash, "payload": payload},
        ensure_ascii=False,
        sort_keys=True,
    )
    return "sha256:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


def clear_for_test() -> None:
    """Used by tests only."""
    with _LOCK:
        if LOG_FILE.exists():
            LOG_FILE.unlink()
