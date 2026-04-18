"""OCR enrichment for text-overlay memes.

The live build degrades gracefully when no frame extraction or OCR dependency is
available. Demo fixtures can provide pre-baked OCR text blocks so tests and the
prototype still exercise the combined transcript + OCR flow.
"""

from __future__ import annotations

from .config import SETTINGS
from .ingest.yt_dlp_wrapper import find_demo_by_id
from .models import OCRResult, OCRTextBlock, VideoMetadata


def extract_ocr(metadata: VideoMetadata) -> OCRResult:
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

    # The current prototype does not download live media frames. Keep the path
    # explicit so callers can distinguish between dependency failure and
    # unavailable frame extraction.
    _ = easyocr  # keep lint happy for optional import
    return OCRResult(
        status="failed",
        provider="easyocr",
        error="Frame extraction not configured in this build.",
    )
