"""Audit log tests."""

import json

from fastapi.testclient import TestClient

from backend import audit, shared_briefings, storage
from backend.main import app


def setup_function(_):
    audit.clear_for_test()
    shared_briefings.clear_for_test()
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


def test_approve_video_marks_human_review_and_audits():
    client = TestClient(app)
    client.post(
        "/ingest",
        json={"url": "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    r = client.post(
        "/videos/ro-georgescu-001/approve",
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["human_review"]["status"] == "approved"
    assert body["human_review"]["approved_by"] == "alice"
    assert body["human_review"]["approved_at"]

    audit_response = client.get(
        "/audit",
        headers={"X-Role": "dpo"},
        params={"action": "video_approved"},
    )
    assert audit_response.status_code == 200
    records = audit_response.json()["records"]
    assert records and records[0]["detail"]["video_id"] == "ro-georgescu-001"


def test_additional_review_removes_approval_and_audits():
    client = TestClient(app)
    client.post(
        "/ingest",
        json={"url": "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    client.post(
        "/videos/ro-georgescu-001/approve",
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    r = client.post(
        "/videos/ro-georgescu-001/additional-review",
        headers={"X-Actor": "bob", "X-Role": "aide"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["human_review"]["status"] == "additional_review"
    assert body["human_review"]["approved_by"] is None
    assert body["human_review"]["approved_at"] is None

    audit_response = client.get(
        "/audit",
        headers={"X-Role": "dpo"},
        params={"action": "video_additional_review"},
    )
    assert audit_response.status_code == 200
    records = audit_response.json()["records"]
    assert records and records[0]["detail"]["video_id"] == "ro-georgescu-001"


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


def test_shared_briefing_creation_contributor_and_agency_input_are_audited():
    client = TestClient(app)
    client.post(
        "/ingest",
        json={"url": "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )

    shared = client.post(
        "/briefing/shared",
        json={
            "video_ids": ["ro-georgescu-001"],
            "constituency": "RO",
            "requester_name": "Alice Aide",
        },
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    assert shared.status_code == 200
    body = shared.json()
    briefing_id = body["briefing_id"]
    assert body["briefing"]["briefing_hash"]
    assert body["source_video_ids"] == ["ro-georgescu-001"]
    assert body["owner_actor"] == "alice"

    invited = client.post(
        f"/briefing/shared/{briefing_id}/contributors",
        json={"agency_name": "EDMO Hub", "contact_label": "analyst@example.eu"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    )
    assert invited.status_code == 200
    contributor = invited.json()["contributors"][0]
    assert contributor["agency_name"] == "EDMO Hub"
    assert contributor["status"] == "invited"

    submitted = client.post(
        f"/briefing/shared/{briefing_id}/agency-inputs",
        json={
            "agency_id": contributor["agency_id"],
            "author": "EDMO analyst",
            "summary": "Additional context from the regional fact-checking hub.",
            "case_details": "The same narrative appeared in a related monitoring case.",
            "evidence_links": ["https://example.eu/case"],
            "evidence_notes": "Link supplied for reviewer follow-up.",
        },
        headers={"X-Actor": "edmo", "X-Role": "agency"},
    )
    assert submitted.status_code == 200
    submitted_body = submitted.json()
    assert submitted_body["contributors"][0]["status"] == "submitted"
    assert submitted_body["agency_inputs"][0]["agency_name"] == "EDMO Hub"
    assert submitted_body["agency_inputs"][0]["evidence_links"] == ["https://example.eu/case"]

    fetched = client.get(f"/briefing/shared/{briefing_id}")
    assert fetched.status_code == 200
    assert fetched.json()["agency_inputs"][0]["summary"].startswith("Additional context")

    audit_response = client.get("/audit", headers={"X-Role": "dpo"})
    actions = [record["action"] for record in audit_response.json()["records"]]
    assert "shared_briefing_created" in actions
    assert "agency_invited" in actions
    assert "agency_input_added" in actions


def test_shared_briefing_rejects_unauthorized_agency_input():
    client = TestClient(app)
    shared = client.post(
        "/briefing/shared",
        json={"video_ids": [], "constituency": "RO"},
        headers={"X-Actor": "alice", "X-Role": "aide"},
    ).json()

    r = client.post(
        f"/briefing/shared/{shared['briefing_id']}/agency-inputs",
        json={
            "agency_id": "agency_missing",
            "author": "Unknown",
            "summary": "Should not be accepted.",
            "case_details": "",
            "evidence_links": [],
            "evidence_notes": "",
        },
        headers={"X-Actor": "unknown", "X-Role": "agency"},
    )
    assert r.status_code == 403
