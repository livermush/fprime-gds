"""Regression coverage for CCSDS counter rollover sites outside Space Packet sequence-count tests (#7)."""

import pytest

from fprime_gds.common.communication.ccsds.space_data_link import (
    SpaceDataLinkFramerDeframer,
)

from test_space_data_link import (
    DATA_FIELD_SIZE,
    FRAME_SIZE_TEST_VALUE,
    SCID_TEST_VALUE,
    VCID_TEST_VALUE,
    make_space_packet,
    make_tm_frame,
)


@pytest.fixture
def framer_deframer():
    return SpaceDataLinkFramerDeframer(
        scid=SCID_TEST_VALUE, vcid=VCID_TEST_VALUE, frame_size=FRAME_SIZE_TEST_VALUE
    )


def test_tc_sequence_number_wraps_modulo_256(framer_deframer):
    """TC frame sequence state wraps 255 -> 0 per CCSDS 8-bit counter (parity with flight U8 increment)."""
    maximum = SpaceDataLinkFramerDeframer.SEQUENCE_NUMBER_MAXIMUM
    framer_deframer.sequence_number = maximum - 1
    assert framer_deframer.get_sequence_number() == maximum - 1
    assert framer_deframer.sequence_number == 0
    assert framer_deframer.get_sequence_number() == 0
    assert framer_deframer.sequence_number == 1


def test_reassemble_vc_count_wrap_preserves_pending(framer_deframer):
    """Virtual channel frame count 255 followed by 0 is contiguous; pending data is not dropped."""
    continuation = b"x" * 100
    framer_deframer.pending = b"partial"
    framer_deframer.last_vc_count = 255
    assert (
        framer_deframer.reassemble(
            continuation,
            SpaceDataLinkFramerDeframer.FHP_NO_PACKET_START,
            vc_count=0,
        )
        == b""
    )
    assert framer_deframer.pending == b"partial" + continuation
    assert framer_deframer.last_vc_count == 0


def test_deframe_three_tm_frames_across_vc_count_wrap(framer_deframer):
    """A run of TM frames across the 8-bit VC counter boundary deframes without treating wrap as loss."""
    packet = make_space_packet(0x100, DATA_FIELD_SIZE)
    frames = [
        make_tm_frame(packet, 0, vc_count=254),
        make_tm_frame(make_space_packet(0x7FF, DATA_FIELD_SIZE), 0, vc_count=255),
        make_tm_frame(make_space_packet(0x101, DATA_FIELD_SIZE), 0, vc_count=0),
    ]
    deframed_packets = []
    for frame in frames:
        deframed, remaining, discarded = framer_deframer.deframe(frame)
        if deframed:
            deframed_packets.append(deframed)
        assert remaining == b""
        assert discarded == b""
    assert packet in deframed_packets[0]