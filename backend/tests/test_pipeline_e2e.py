"""End-to-end smoke test: ingest each demo video, verify expected indicators."""

from backend import storage
from backend.ingest.yt_dlp_wrapper import all_demo_videos
from backend.pipeline import analyze_url


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
