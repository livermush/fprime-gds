"""Regression guard for docs/ccsds-counter-widths.md (counter moduli and ground symbols)."""

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[5]
_DOC_PATH = _REPO_ROOT / "docs" / "ccsds-counter-widths.md"


def test_ccsds_counter_widths_doc_preserves_moduli_and_symbols():
    """Doc must keep moduli, AOS width note, and ground constant names to prevent silent drift."""
    text = _DOC_PATH.read_text(encoding="utf-8")

    for token in (
        "16384",
        "256",
        "SEQUENCE_COUNT_MAXIMUM",
        "VC_FRAME_COUNT_MAXIMUM",
    ):
        assert token in text, f"missing required token: {token!r}"

    assert "24" in text and "28" in text, "AOS 24/28-bit width note missing"
    assert "AosDeframer" in text
    assert "ccsds-flight-ground-boundary.canvas.tsx" in text