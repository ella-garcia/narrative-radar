from backend.match.matcher import match_claims, best_cluster
from backend.models import Claim


def test_ro_election_claim_matches_seed_corpus():
    claims = [
        Claim(
            text="Liderii noștri pro-europeni nu sunt români — sunt marionete ale NATO.",
            category="military",
        )
    ]
    matches = match_claims(claims, threshold=0.05)
    assert matches, "expected at least one fact-check match"
    # Best match should be in the Romania election cluster
    assert any("ro-georgescu" in m.factcheck_id or "ro-eu" in m.factcheck_id
               for m in matches)


def test_doppelganger_de_matches_doppelganger_cluster():
    claims = [
        Claim(
            text="Der Spiegel berichtet: die deutsche Wirtschaft bricht unter den EU-Sanktionen zusammen.",
            category="government",
        )
    ]
    cluster, sim = best_cluster(claims)
    assert cluster == "doppelganger_2024"
    assert sim > 0.05


def test_unrelated_text_returns_no_match_at_high_threshold():
    claims = [Claim(text="I had cereal for breakfast and went jogging.", category="other")]
    matches = match_claims(claims, threshold=0.5)
    assert matches == []


def test_empty_claims_returns_empty():
    assert match_claims([]) == []
