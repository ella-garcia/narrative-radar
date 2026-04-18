"""OpenAI provider adapter for transcription and structured claim extraction."""

from __future__ import annotations

import json
from pathlib import Path

from ..config import SETTINGS, live_provider_calls_allowed
from ..models import Claim, OCRTextBlock, Transcript
from .base import ProviderError, ProviderNotConfigured


CLAIMS_JSON_SCHEMA = {
    "name": "claim_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "text": {"type": "string"},
                        "category": {
                            "type": "string",
                            "enum": [
                                "election",
                                "government",
                                "military",
                                "health",
                                "eu_institutions",
                                "migration",
                                "climate",
                                "other",
                            ],
                        },
                        "speaker": {"type": ["string", "null"]},
                        "start_sec": {"type": ["number", "null"]},
                        "end_sec": {"type": ["number", "null"]},
                    },
                    "required": ["text", "category", "speaker", "start_sec", "end_sec"],
                },
            }
        },
        "required": ["claims"],
    },
}


SYSTEM_PROMPT = """You extract discrete, verifiable factual claims for parliamentary fact-checkers.
Use transcript and OCR text. Do not rebut or characterize truth. Return JSON only."""


def extract_claims(transcript: Transcript, ocr_blocks: list[OCRTextBlock]) -> list[Claim]:
    if not SETTINGS.openai_api_key or not live_provider_calls_allowed():
        raise ProviderNotConfigured("openai")
    try:
        from openai import OpenAI  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ProviderNotConfigured("openai-sdk") from exc

    client = OpenAI(api_key=SETTINGS.openai_api_key)
    user = _claim_input(transcript, ocr_blocks)

    try:
        resp = client.responses.create(
            model=SETTINGS.openai_claim_model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user},
            ],
            text={"format": {"type": "json_schema", **CLAIMS_JSON_SCHEMA}},
            temperature=0,
        )
        text = getattr(resp, "output_text", "") or _response_text(resp)
    except Exception:
        # Some older SDK versions may not expose Responses yet; fall back to
        # Chat Completions while preserving strict schema mode where available.
        resp = client.chat.completions.create(
            model=SETTINGS.openai_claim_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + " JSON schema: " + json.dumps(CLAIMS_JSON_SCHEMA["schema"])},
                {"role": "user", "content": user},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": CLAIMS_JSON_SCHEMA,
            },
            temperature=0,
        )
        text = resp.choices[0].message.content or "{}"

    try:
        payload = json.loads(text or "{}")
        return [Claim(**c) for c in payload.get("claims", [])]
    except Exception as exc:
        raise ProviderError(f"OpenAI claim response could not be parsed: {exc}") from exc


def transcribe(audio_path: Path, language: str | None = None) -> Transcript:
    if not SETTINGS.openai_api_key or not live_provider_calls_allowed():
        raise ProviderNotConfigured("openai")
    try:
        from openai import OpenAI  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ProviderNotConfigured("openai-sdk") from exc

    client = OpenAI(api_key=SETTINGS.openai_api_key)
    with audio_path.open("rb") as f:
        resp = client.audio.transcriptions.create(
            model=SETTINGS.openai_transcribe_model,
            file=f,
            response_format="json",
            language=language,
        )
    text = getattr(resp, "text", "") or ""
    return Transcript(
        language=language or "unknown",
        segments=[{"start": 0, "end": None, "speaker": "SPEAKER_00", "text": text}],
        full_text=text,
        confidence="high",
    )


def _claim_input(transcript: Transcript, ocr_blocks: list[OCRTextBlock]) -> str:
    ocr = "\n".join(
        f"- {b.text} (confidence={b.confidence}, frame_sec={b.frame_sec})"
        for b in ocr_blocks
    )
    return (
        f"Language: {transcript.language}\n"
        f"Confidence: {transcript.confidence}\n"
        f"Transcript:\n{transcript.full_text}\n\n"
        f"OCR text blocks:\n{ocr}"
    )


def _response_text(resp: object) -> str:
    chunks: list[str] = []
    for item in getattr(resp, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(text)
    return "\n".join(chunks)
