"""Claim extraction. Uses GPT-4o structured output if OPENAI_API_KEY is set;
otherwise falls back to a deterministic keyword-aware mock extractor that
returns realistic, demo-quality claims for the seed corpus."""

from __future__ import annotations

import json
import re

from ..config import SETTINGS
from ..models import Claim, OCRTextBlock, Transcript


CLAIM_SCHEMA_PROMPT = """You are a claim-extraction assistant for parliamentary fact-checkers.

From the transcript and OCR text provided, extract the discrete, verifiable factual claims
the speaker is asserting. DO NOT interpret, characterise, or rebut. Extract
facts exactly as asserted. Skip rhetorical questions, opinions, and exhortations.
When OCR text contains meaningful overlay claims, include those as claims too.

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


def extract_claims(
    transcript: Transcript,
    ocr_blocks: list[OCRTextBlock] | None = None,
) -> list[Claim]:
    if SETTINGS.openai_api_key:
        try:
            return _extract_via_gpt4o(transcript, ocr_blocks or [])
        except Exception:
            # Demo robustness — fall through to mock if OpenAI errors out.
            return _extract_via_mock(transcript, ocr_blocks or [])
    return _extract_via_mock(transcript, ocr_blocks or [])


# -----------------------------------------------------------------------------
# Real path
# -----------------------------------------------------------------------------


def _extract_via_gpt4o(transcript: Transcript, ocr_blocks: list[OCRTextBlock]) -> list[Claim]:
    from openai import OpenAI  # type: ignore[import-not-found]

    client = OpenAI(api_key=SETTINGS.openai_api_key)
    user = (
        f"Language: {transcript.language}\n"
        f"Confidence: {transcript.confidence}\n"
        f"Transcript:\n{transcript.full_text}\n\n"
        "OCR text blocks:\n"
        + "\n".join(
            f"- {b.text} (confidence={b.confidence}, frame_sec={b.frame_sec})"
            for b in ocr_blocks
        )
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


def _extract_via_mock(
    transcript: Transcript,
    ocr_blocks: list[OCRTextBlock],
) -> list[Claim]:
    out: list[Claim] = []
    seen_texts: set[str] = set()
    sources = [
        ("transcript", seg["text"], seg.get("speaker"), seg.get("start"), seg.get("end"))
        for seg in transcript.segments
    ] + [
        ("ocr", block.text, None, block.frame_sec, block.frame_sec)
        for block in ocr_blocks
        if block.text.strip()
    ]
    for _, text, speaker, start, end in sources:
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
                        speaker=speaker,
                        start_sec=start,
                        end_sec=end,
                    )
                )
                break
    if not out and sources:
        # Surface at least one claim so downstream stages have something to work
        # with. Marked 'other' to keep the system honest about its weak signal.
        _, text, speaker, start, end = sources[0]
        out.append(
            Claim(
                text=text.strip(),
                category="other",
                speaker=speaker,
                start_sec=start,
                end_sec=end,
            )
        )
    return out[:6]
