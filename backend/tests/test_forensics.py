"""Forensics endpoint tests."""

from fastapi.testclient import TestClient

from backend import storage
from backend.main import app
from backend.pipeline import analyze_url, enrich_lineage


def setup_function(_):
    storage.clear()


def test_forensics_accounts_empty_before_ingest():
    client = TestClient(app)
    r = client.get("/forensics/accounts")
    assert r.status_code == 200
    assert r.json() == []


def test_forensics_accounts_returns_ingested_authors():
    client = TestClient(app)
    analyze_url("https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045")

    r = client.get("/forensics/accounts")
    assert r.status_code == 200
    accounts = r.json()
    assert accounts
    assert accounts[0]["handle"] == "@patriot_romania_real"
    assert accounts[0]["video_count"] == 1
    assert accounts[0]["known_clusters"] == ["ro_election_2024"]


def test_forensics_profile_includes_cadence_missing_data_and_edges():
    client = TestClient(app)
    v = analyze_url("https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045")
    enriched = enrich_lineage(v.metadata.video_id)
    assert enriched is not None

    r = client.get("/forensics/accounts/@patriot_romania_real")
    assert r.status_code == 200
    profile = r.json()
    assert profile["summary"]["handle"] == "@patriot_romania_real"
    assert profile["posting_cadence"]
    assert profile["amplification_edges"]
    signal_types = {s["signal_type"] for s in profile["signals"]}
    assert "missing_data" in signal_types
    assert "shared_audio_amplification" in signal_types
    assert profile["missing_data_notes"]


def test_forensics_trends_aggregate_cluster_language_and_date():
    client = TestClient(app)
    analyze_url("https://www.tiktok.com/@infos_actu_fr/video/7437281904763820145")
    analyze_url("https://www.tiktok.com/@nachrichten_real/video/7438192873645127364")

    r = client.get("/forensics/trends")
    assert r.status_code == 200
    trends = r.json()
    assert trends
    assert any(t["cluster_id"] == "doppelganger_2024" for t in trends)
    assert {t["language"] for t in trends} >= {"fr", "de"}


def test_forensics_profile_404_for_unknown_handle():
    client = TestClient(app)
    r = client.get("/forensics/accounts/@missing")
    assert r.status_code == 404
