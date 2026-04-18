"""OCR enrichment for text-overlay memes.

The live build degrades gracefully when no frame extraction or OCR dependency is
available. Demo fixtures can provide pre-baked OCR text blocks so tests and the
prototype still exercise the combined transcript + OCR flow.
"""

from __future__ import annotations

from pathlib import Path

from .config import SETTINGS
from .ingest.yt_dlp_wrapper import find_demo_by_id
from .models import OCRResult, OCRTextBlock, VideoMetadata


def extract_ocr(metadata: VideoMetadata, frame_paths: list[Path] | None = None) -> OCRResult:
    demo = find_demo_by_id(metadata.video_id) or {}
    demo_blocks = demo.get("ocr_blocks") or []
    if demo_blocks:
        return OCRResult(
            status="complete",
            provider="demo",
            blocks=[OCRTextBlock(**block, source="demo") for block in demo_blocks],
        )

    if not SETTINGS.ocr_enabled:
        return OCRResult(status="skipped", provider="none", error="OCR disabled")

    try:
        import easyocr  # type: ignore[import-not-found]
    except ImportError:
        return OCRResult(
            status="skipped",
            provider="easyocr",
            error="EasyOCR not installed and no demo OCR blocks available.",
        )

    if not frame_paths:
        # The current prototype only has frames when controlled media downloads
        # are enabled. Keep the status explicit.
        _ = easyocr
        return OCRResult(
            status="failed",
            provider="easyocr",
            error="Frame extraction not configured in this build.",
        )

    try:
        reader = easyocr.Reader(["en"], gpu=False)
        blocks: list[OCRTextBlock] = []
        for path in frame_paths:
            for bbox, text, confidence in reader.readtext(str(path)):
                _ = bbox
                if text.strip():
                    blocks.append(
                        OCRTextBlock(
                            text=text.strip(),
                            confidence=float(confidence),
                            source="easyocr",
                        )
                    )
        return OCRResult(status="complete", provider="easyocr", blocks=blocks)
    except Exception as exc:
        return OCRResult(status="failed", provider="easyocr", error=str(exc))
