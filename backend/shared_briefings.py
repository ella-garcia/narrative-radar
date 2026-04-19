"""JSON sidecar store for shared policy briefings.

Hackathon-grade persistence mirroring `storage.py`: one process, one JSON file,
and explicit mutation helpers for the Briefings-tab collaboration workflow.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .models import (
    AgencyContributor,
    AgencyContributorRequest,
    AgencyInput,
    AgencyInputRequest,
    Briefing,
    SharedBriefing,
)

DATA_DIR = Path(__file__).resolve().parent / "data"
STORE_FILE = DATA_DIR / "shared_briefings.json"

_LOCK = threading.RLock()
_STORE: dict[str, SharedBriefing] = {}
_LOADED = False


def _load_from_disk() -> None:
    global _LOADED
    if _LOADED:
        return
    if STORE_FILE.exists():
        try:
            raw = json.loads(STORE_FILE.read_text())
            for entry in raw:
                b = SharedBriefing.model_validate(entry)
                _STORE[b.briefing_id] = b
        except Exception:
            _STORE.clear()
    _LOADED = True


def _flush() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORE_FILE.write_text(
        json.dumps(
            [b.model_dump(mode="json") for b in _STORE.values()],
            ensure_ascii=False,
            indent=2,
        )
    )


def create(
    *,
    briefing: Briefing,
    source_video_ids: list[str],
    owner_actor: str,
    constituency: str | None,
) -> SharedBriefing:
    now = datetime.now(tz=timezone.utc)
    shared = SharedBriefing(
        briefing_id="brief_" + uuid.uuid4().hex[:12],
        briefing=briefing,
        source_video_ids=source_video_ids,
        owner_actor=owner_actor,
        constituency=constituency,
        created_at=now,
        updated_at=now,
    )
    with _LOCK:
        _load_from_disk()
        _STORE[shared.briefing_id] = shared
        _flush()
    return shared


def get(briefing_id: str) -> SharedBriefing | None:
    with _LOCK:
        _load_from_disk()
        return _STORE.get(briefing_id)


def add_contributor(
    briefing_id: str,
    req: AgencyContributorRequest,
    *,
    invited_by: str,
) -> SharedBriefing | None:
    with _LOCK:
        _load_from_disk()
        shared = _STORE.get(briefing_id)
        if not shared:
            return None
        now = datetime.now(tz=timezone.utc)
        contributor = AgencyContributor(
            agency_id="agency_" + uuid.uuid4().hex[:10],
            agency_name=req.agency_name.strip(),
            contact_label=(req.contact_label or "").strip() or None,
            invited_at=now,
            invited_by=invited_by,
        )
        updated = shared.model_copy(
            update={
                "contributors": [*shared.contributors, contributor],
                "updated_at": now,
            }
        )
        _STORE[briefing_id] = updated
        _flush()
        return updated


def add_agency_input(
    briefing_id: str,
    req: AgencyInputRequest,
) -> tuple[SharedBriefing | None, str | None]:
    with _LOCK:
        _load_from_disk()
        shared = _STORE.get(briefing_id)
        if not shared:
            return None, "not_found"
        contributor = next(
            (c for c in shared.contributors if c.agency_id == req.agency_id),
            None,
        )
        if not contributor:
            return None, "unauthorized_agency"
        now = datetime.now(tz=timezone.utc)
        agency_input = AgencyInput(
            input_id="input_" + uuid.uuid4().hex[:12],
            agency_id=contributor.agency_id,
            agency_name=contributor.agency_name,
            author=req.author.strip() or contributor.contact_label or contributor.agency_name,
            summary=req.summary.strip(),
            case_details=req.case_details.strip(),
            evidence_links=[link.strip() for link in req.evidence_links if link.strip()],
            evidence_notes=req.evidence_notes.strip(),
            created_at=now,
            updated_at=now,
        )
        contributors = [
            c.model_copy(update={"status": "submitted"})
            if c.agency_id == contributor.agency_id
            else c
            for c in shared.contributors
        ]
        updated = shared.model_copy(
            update={
                "contributors": contributors,
                "agency_inputs": [*shared.agency_inputs, agency_input],
                "updated_at": now,
            }
        )
        _STORE[briefing_id] = updated
        _flush()
        return updated, None


def update_briefing(briefing_id: str, briefing: Briefing) -> SharedBriefing | None:
    with _LOCK:
        _load_from_disk()
        shared = _STORE.get(briefing_id)
        if not shared:
            return None
        updated = shared.model_copy(
            update={
                "briefing": briefing,
                "updated_at": datetime.now(tz=timezone.utc),
            }
        )
        _STORE[briefing_id] = updated
        _flush()
        return updated


def clear_for_test() -> None:
    global _LOADED
    with _LOCK:
        _STORE.clear()
        _LOADED = False
        if STORE_FILE.exists():
            STORE_FILE.unlink()
