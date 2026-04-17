"""Claim extraction. Uses GPT-4o structured output if OPENAI_API_KEY is set;
otherwise falls back to a deterministic keyword-aware mock extractor that
returns realistic, demo-quality claims for the seed corpus."""

from __future__ import annotations

import json
import re

from ..config import SETTINGS
from ..models import Claim, Transcript


CLAIM_SCHEMA_PROMPT = """You are a claim-extraction assistant for parliamentary fact-checkers.

From the transcript provided, extract the discrete, verifiable factual claims
the speaker is asserting. DO NOT interpret, characterise, or rebut. Extract
facts exactly as asserted. Skip rhetorical questions, opinions, and exhortations.

Return STRICT JSON in this schema:
{
  "claims": [
    {
      "text": "<claim, in the original language, paraphrased only if needed for clarity>",
      "category": "election" | "government" | "military" | "health" | "eu_institutions" | "migration" | "climate" | "other",
      "speaker": "<speaker label or null>",
      "start_sec": <number or null>,
      "end_sec": <number or null>
    }
  ]
}

Aim for 2-6 claims. Skip none-found and return an empty list rather than fabricating.
"""


def extract_claims(transcript: Transcript) -> list[Claim]:
    if SETTINGS.openai_api_key:
        try:
            return _extract_via_gpt4o(transcript)
        except Exception:
            # Demo robustness — fall through to mock if OpenAI errors out.
            return _extract_via_mock(transcript)
    return _extract_via_mock(transcript)


# -----------------------------------------------------------------------------
# Real path
# -----------------------------------------------------------------------------


def _extract_via_gpt4o(transcript: Transcript) -> list[Claim]:
    from openai import OpenAI  # type: ignore[import-not-found]

    client = OpenAI(api_key=SETTINGS.openai_api_key)
    user = (
        f"Language: {transcript.language}\n"
        f"Confidence: {transcript.confidence}\n"
        f"Transcript:\n{transcript.full_text}"
    )
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CLAIM_SCHEMA_PROMPT},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    payload = json.loads(resp.choices[0].message.content or "{}")
    return [Claim(**c) for c in payload.get("claims", [])]


# -----------------------------------------------------------------------------
# Mock path — keyword-driven, multilingual
# -----------------------------------------------------------------------------

# Each rule: (keyword set in lowercase, category, claim template using captured
# segment text). The mock is intentionally simple: it walks transcript segments
# and emits one claim per matching segment.
_RULES: list[tuple[set[str], str]] = [
    ({"nato", "marionete", "puppet", "vând", "vând"}, "military"),
    ({"prim-strike", "first-strike", "bază", "base", "tinta", "țintă"}, "military"),
    ({"georgescu", "votează", "alegeri", "vote", "candidat"}, "election"),
    ({"bruxelles", "ue", "uniunea europeană", "eu", "europäische union"}, "eu_institutions"),
    ({"distruge", "destroying", "kollabiert", "collapsing", "collapse"}, "government"),
    ({"truppe", "troupes", "troops", "wojska", "wojsko", "army", "wojnę", "war"}, "military"),
    ({"sanktion", "sanctions", "sanzioni", "sankcje"}, "government"),
    ({"refugee", "refugees", "flüchtlinge", "uchodźcy", "migran", "migration"}, "migration"),
    ({"klima", "climate", "clima"}, "climate"),
    ({"vaccine", "vaccin", "vakzin", "infert"}, "health"),
    ({"election", "alegeri", "wahl", "wybory", "elezioni"}, "election"),
    ({"censure", "censura", "zensiert", "censored", "censur"}, "eu_institutions"),
    ({"commission", "kommission", "comisia", "comisión", "commissione"}, "eu_institutions"),
]


def _extract_via_mock(transcript: Transcript) -> list[Claim]:
    out: list[Claim] = []
    seen_texts: set[str] = set()
    for seg in transcript.segments:
        text: str = seg["text"]
        normalised = re.sub(r"[^\w\s]", " ", text.lower())
        words = set(normalised.split())
        for keywords, category in _RULES:
            if keywords & words:
                if text in seen_texts:
                    continue
                seen_texts.add(text)
                out.append(
                    Claim(
                        text=text.strip(),
                        category=category,
                        speaker=seg.get("speaker"),
                        start_sec=seg.get("start"),
                        end_sec=seg.get("end"),
                    )
                )
                break
    if not out and transcript.segments:
        # Surface at least one claim so downstream stages have something to work
        # with. Marked 'other' to keep the system honest about its weak signal.
        s = transcript.segments[0]
        out.append(
            Claim(
                text=s["text"].strip(),
                category="other",
                speaker=s.get("speaker"),
                start_sec=s.get("start"),
                end_sec=s.get("end"),
            )
        )
    return out[:6]
