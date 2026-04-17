"""Audit log tests."""

import json

from fastapi.testclient import TestClient

from backend import audit, storage
from backend.main import app


def setup_function(_):
    audit.clear_for_test()
    storage.clear()


def test_log_writes_record_with_chain():
    r1 = audit.log(actor="alice", role="aide", action="ingest", detail={"x": 1})
    r2 = audit.log(actor="alice", role="aide", action="briefing_generated", detail={"y": 2})
    assert r1["prev_hash"] == "sha256:0000000000000000"
    assert r2["prev_hash"] == r1["entry_hash"]
    assert r1["entry_hash"] != r2["entry_hash"]


def test_verify_chain_intact_after_writes():
    audit.log(actor="alice", role="aide", action="ingest", detail={"a": 1})
    audit.log(actor="alice", role="aide", action="ingest", detail={"a": 2})
    chain = audit.verify_chain()
    assert chain["intact"] is True
    assert chain["total_records"] == 2
    assert chain["broken_indices"] == []


def test_verify_chain_detects_tampering():
    audit.log(actor="alice", role="aide", action="ingest", detail={"a": 1})
    audit.log(actor="alice", role="aide", action="ingest", detail={"a": 2})

    # Tamper: rewrite the file with the second record's detail mutated.
    lines = audit.LOG_FILE.read_text().splitlines()
    last = json.loads(lines[-1])
    last["detail"]["a"] = 999
    lines[-1] = json.dumps(last)
    audit.LOG_FILE.write_text("\n".join(lines) + "\n")

    chain = audit.verify_chain()
    assert chain["intact"] is False
    assert 1 in chain["broken_indices"]


def test_audit_endpoint_requires_dpo_role():
    client = TestClient(app)
    r = client.get("/audit")
    assert r.status_code == 403
    r = client.get("/audit", headers={"X-Role": "aide"})
    assert r.status_code == 403


def test_audit_endpoint_returns_records_for_dpo():
    client = TestClient(app)
    # Generate one auditable event via the public API
    client.post(
        "/ingest",
        json={"url": "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"},
        headers={"X-Actor": "alice@parl.example", "X-Role": "aide"},
    )
    r = client.get("/audit", headers={"X-Role": "dpo"})
    assert r.status_code == 200
    body = r.json()
    assert body["count_total"] >= 1
    assert body["chain"]["intact"] is True
    assert any(rec["action"] == "ingest" for rec in body["records"])
    # Actor + role were captured
    ingest_rec = next(rec for rec in body["records"] if rec["action"] == "ingest")
    assert ingest_rec["actor"] == "alice@parl.example"
    assert ingest_rec["role"] == "aide"


def test_audit_filters_by_action():
    client = TestClient(app)
    client.post(
        "/ingest",
        json={"url": "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    client.post(
        "/briefing",
        json={"video_ids": ["ro-georgescu-001"], "constituency": "RO"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    r = client.get(
        "/audit",
        headers={"X-Role": "dpo"},
        params={"action": "briefing_generated"},
    )
    assert r.status_code == 200
    recs = r.json()["records"]
    assert recs and all(rec["action"] == "briefing_generated" for rec in recs)


def test_briefing_hash_recorded_in_audit():
    client = TestClient(app)
    client.post(
        "/ingest",
        json={"url": "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    b = client.post(
        "/briefing",
        json={"video_ids": ["ro-georgescu-001"], "constituency": "RO"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    ).json()
    assert b["briefing_hash"], "briefing must include a content hash"
    r = client.get("/audit", headers={"X-Role": "dpo"})
    rec = next(x for x in r.json()["records"] if x["action"] == "briefing_generated")
    assert rec["detail"]["briefing_hash"] == b["briefing_hash"]
