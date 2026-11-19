"""Regression locks for CCSDS counter wrap (modulo) behavior in ground framer/deframer helpers."""

import struct

import pytest

from fprime_gds.common.communication.ccsds.space_data_link import SpaceDataLinkFramerDeframer
from fprime_gds.common.communication.ccsds.space_packet import SpacePacketFramerDeframer

SCID_TEST_VALUE = 0x77
VCID_TEST_VALUE = 5
FRAME_SIZE_TEST_VALUE = 2222
DATA_FIELD_SIZE = (
    FRAME_SIZE_TEST_VALUE
    - SpaceDataLinkFramerDeframer.TM_HEADER_SIZE
    - SpaceDataLinkFramerDeframer.TM_TRAILER_SIZE
)
TC_SEQUENCE_BYTE_OFFSET = 4


def make_space_packet(apid, total_size):
    """Build a Space Packet of the given total size (header + payload)."""
    payload_size = total_size - SpaceDataLinkFramerDeframer.SPACE_PACKET_HEADER_SIZE
    header = struct.pack(">HHH", apid & 0x7FF, 0xC000, payload_size - 1)
    return header + bytes([i % 256 for i in range(payload_size)])


def make_tm_frame(data_field, first_header_pointer, vc_count=0, mc_count=0, data_field_size=DATA_FIELD_SIZE):
    """Build a valid TM frame around the given data field."""
    assert len(data_field) == data_field_size
    global_vcid_u16 = (SCID_TEST_VALUE << 4) | (VCID_TEST_VALUE << 1)
    status_u16 = (0x3 << 11) | (first_header_pointer & SpaceDataLinkFramerDeframer.FHP_MASK)
    frame_no_crc = struct.pack(">HBBH", global_vcid_u16, mc_count, vc_count, status_u16) + data_field
    crc = SpaceDataLinkFramerDeframer.CCITT_CRC_FUNCTION(frame_no_crc)
    return frame_no_crc + struct.pack(">H", crc)


@pytest.fixture
def tm_framer_deframer():
    return SpaceDataLinkFramerDeframer(scid=SCID_TEST_VALUE, vcid=VCID_TEST_VALUE, frame_size=FRAME_SIZE_TEST_VALUE)


@pytest.fixture
def space_packet_framer_deframer():
    return SpacePacketFramerDeframer()


def test_apid_sequence_count_wraps_at_maximum(space_packet_framer_deframer):
    """APID sequence count at 16383 wraps to 0 on the next get_sequence_count (happy path, not mismatch)."""
    apid = 0x200
    maximum = SpacePacketFramerDeframer.SEQUENCE_COUNT_MAXIMUM
    space_packet_framer_deframer.apid_to_sequence_count_map[apid] = maximum - 1

    assert space_packet_framer_deframer.get_sequence_count(apid) == maximum - 1
    assert space_packet_framer_deframer.get_sequence_count(apid) == 0
    assert space_packet_framer_deframer.apid_to_sequence_count_map[apid] == 1


def test_tm_helper_sequence_number_wraps_at_255(tm_framer_deframer):
    """TM get_sequence_number wraps 255 to 0 (helper not used in production TC frame)."""
    tm_framer_deframer.sequence_number = SpaceDataLinkFramerDeframer.SEQUENCE_NUMBER_MAXIMUM - 1

    assert tm_framer_deframer.get_sequence_number() == 255
    assert tm_framer_deframer.get_sequence_number() == 0
    assert tm_framer_deframer.sequence_number == 1


def test_tc_frame_writes_zero_sequence_byte_despite_helper_wrap(tm_framer_deframer):
    """TC frame() always emits sequence byte 0 (bypass FARM), even after get_sequence_number wraps."""
    tm_framer_deframer.sequence_number = SpaceDataLinkFramerDeframer.SEQUENCE_NUMBER_MAXIMUM - 1
    assert tm_framer_deframer.get_sequence_number() == 255
    assert tm_framer_deframer.get_sequence_number() == 0

    payload = b"tc-payload"
    first = tm_framer_deframer.frame(payload)
    second = tm_framer_deframer.frame(payload)
    assert first[TC_SEQUENCE_BYTE_OFFSET] == 0
    assert second[TC_SEQUENCE_BYTE_OFFSET] == 0


def test_vc_count_wrap_255_to_0_emits_packet_without_loss_warning(tm_framer_deframer, capsys):
    """VC frame count 255 then 0 is valid wrap; packets emit with no TM frame loss warning."""
    span = make_space_packet(0x101, DATA_FIELD_SIZE + 500)
    idle = make_space_packet(0x7FF, DATA_FIELD_SIZE - 500)
    frame1 = make_tm_frame(span[:DATA_FIELD_SIZE], 0, vc_count=255)
    frame2 = make_tm_frame(span[DATA_FIELD_SIZE:] + idle, 500, vc_count=0)

    assert tm_framer_deframer.deframe(frame1)[0] is None
    assert tm_framer_deframer.deframe(frame2)[0] == span + idle
    assert "TM frame loss detected" not in capsys.readouterr().err


def test_vc_count_gap_255_to_one_skipping_zero_reports_frame_loss(tm_framer_deframer, capsys):
    """VC count 255 then 1 (skipping 0) is frame loss, not valid wrap."""
    span = make_space_packet(0x101, DATA_FIELD_SIZE + 500)
    packet = make_space_packet(0x102, DATA_FIELD_SIZE - 500)
    frame1 = make_tm_frame(span[:DATA_FIELD_SIZE], 0, vc_count=255)
    frame2 = make_tm_frame(b"\xAA" * 500 + packet, 500, vc_count=1)

    assert tm_framer_deframer.deframe(frame1)[0] is None
    assert tm_framer_deframer.deframe(frame2)[0] == packet
    captured = capsys.readouterr()
    assert "[WARNING] TM frame loss detected. Discarding partial packet data." in captured.err