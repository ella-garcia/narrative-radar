"""End-to-end smoke test: ingest each demo video, verify expected indicators."""

from backend import storage
from backend.ingest.yt_dlp_wrapper import all_demo_videos
from backend.pipeline import analyze_url, enrich_lineage
from backend.main import list_videos


def setup_function(_):
    storage.clear()


def test_romania_case_fires_dsa_art_34_35():
    storage.clear()
    ro_url = "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"
    v = analyze_url(ro_url)
    assert v.metadata.platform.value == "tiktok"
    assert v.metadata.language == "ro"
    assert v.fact_check_matches, "expected EDMO match for Romania case"
    refs = {g.article_ref for g in v.compliance_gaps}
    assert "DSA Art. 34-35" in refs
    assert v.severity.score > 25


def test_doppelganger_cross_language_fires_art_26():
    storage.clear()
    fr = "https://www.tiktok.com/@infos_actu_fr/video/7437281904763820145"
    de = "https://www.tiktok.com/@nachrichten_real/video/7438192873645127364"
    pl = "https://www.tiktok.com/@prawda_pl_2024/video/7439028174625301428"

    analyze_url(fr)
    analyze_url(de)
    last = analyze_url(pl)

    refs = {g.article_ref for g in last.compliance_gaps}
    assert "DSA Art. 26" in refs
    art26 = next(g for g in last.compliance_gaps if g.article_ref == "DSA Art. 26")
    assert art26.severity == "high"
    assert art26.evidence["cross_language"] is True


def test_deepfake_audio_fires_art_50():
    storage.clear()
    url = "https://www.tiktok.com/@eu_truth_now/video/7436192834751029384"
    v = analyze_url(url)
    refs = {g.article_ref for g in v.compliance_gaps}
    assert "AI Act Art. 50" in refs


def test_all_demo_videos_run_without_error():
    storage.clear()
    for d in all_demo_videos():
        v = analyze_url(d["url"])
        assert v.metadata.video_id == d["video_id"]


def test_tiktok_lineage_starts_pending_then_enriches():
    storage.clear()
    url = "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045"
    v = analyze_url(url)
    assert v.derivative_spread.status == "pending"
    enriched = enrich_lineage(v.metadata.video_id)
    assert enriched is not None
    assert enriched.derivative_spread.status == "complete"
    assert enriched.derivative_spread.derivative_count >= 2
    assert enriched.severity.final_score is not None


def test_ocr_blocks_contribute_to_result():
    storage.clear()
    url = "https://www.tiktok.com/@infos_actu_fr/video/7437281904763820145"
    v = analyze_url(url)
    assert v.ocr_result.blocks, "expected demo OCR blocks"
    assert any("article" in c.text.lower() or "capture" in c.text.lower() for c in v.claims)


def test_new_demo_clusters_have_different_derivative_spread_radius():
    storage.clear()
    cases = [
        (
            "https://www.tiktok.com/@verde_verita/video/7451010000000000001",
            1,
            94_000,
            "climate_denial",
        ),
        (
            "https://www.tiktok.com/@alarm_ue_pl/video/7452010000000000001",
            2,
            463_000,
            "eu_militarisation",
        ),
        (
            "https://www.tiktok.com/@contante_libero/video/7453010000000000001",
            2,
            536_000,
            "cbdc_conspiracy",
        ),
    ]

    for url, expected_count, expected_reach, expected_cluster in cases:
        v = analyze_url(url)
        enriched = enrich_lineage(v.metadata.video_id)
        assert enriched is not None
        assert enriched.cluster_id == expected_cluster
        assert enriched.derivative_spread.status == "complete"
        assert enriched.derivative_spread.derivative_count == expected_count
        assert enriched.derivative_spread.aggregate_reach == expected_reach


def test_constituency_filter_returns_only_matching_items():
    storage.clear()
    analyze_url(
        "https://www.tiktok.com/@calingeorgescu_official/video/7438219348761239045",
        constituency="ro",
    )
    analyze_url(
        "https://www.tiktok.com/@contante_libero/video/7453010000000000001",
        constituency="IT",
    )

    all_items = list_videos()
    ro_items = list_videos(constituency="RO")
    it_items = list_videos(constituency="it")
    de_items = list_videos(constituency="DE")

    assert {v.constituency for v in all_items} == {"ro", "IT"}
    assert [v.metadata.video_id for v in ro_items] == ["ro-georgescu-001"]
    assert [v.metadata.video_id for v in it_items] == ["digital-euro-it-001"]
    assert de_items == []
