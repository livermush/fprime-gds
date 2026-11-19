"""Guardrails for docs/ccsds-counter-widths.md (#32)."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[5]
DOC_PATH = REPO_ROOT / "docs" / "ccsds-counter-widths.md"

REQUIRED_RULE = "next = (count + 1) mod width"
REQUIRED_COUNTERS = (
    "14-bit Space Packet sequence count",
    "8-bit TM virtual channel frame count",
    "TC frame sequence number (`get_sequence_number`)",
)
REQUIRED_16384 = "16384 must never appear as an expected sequence count"
REQUIRED_TC_FRAME = "TC `frame()` sends sequence byte 0"


def test_ccsds_counter_widths_doc_exists_and_covers_counters():
    assert DOC_PATH.is_file(), f"missing maintainer doc: {DOC_PATH}"
    text = DOC_PATH.read_text(encoding="utf-8")
    assert REQUIRED_RULE in text, "doc must state the counter increment rule"
    for label in REQUIRED_COUNTERS:
        assert label in text, f"doc must document counter: {label}"
    assert REQUIRED_16384 in text, "doc must forbid 16384 as an expected sequence count"
    assert REQUIRED_TC_FRAME in text, "doc must note TC frame() sequence byte"