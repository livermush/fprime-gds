"""Regression tests for CCSDS counter wrap-around outside the gap-resync path.

VC frame count wrap (255 -> 0) during spanning-packet reassembly is already covered by
``test_deframe_spanning_vc_count_wrap`` in ``test_space_data_link.py``; this module does not
duplicate that scenario.
"""

import logging

import pytest

from ccsds_streams import make_space_packet

from fprime_gds.common.communication.ccsds.space_data_link import SpaceDataLinkFramerDeframer
from fprime_gds.common.communication.ccsds.space_packet import SpacePacketFramerDeframer

APID = 0x100
WRAP_SEQ = SpacePacketFramerDeframer.SEQUENCE_COUNT_MAXIMUM - 1


@pytest.fixture
def space_packet_framer_deframer():
    return SpacePacketFramerDeframer()


@pytest.fixture
def space_data_link_framer_deframer():
    return SpaceDataLinkFramerDeframer(scid=0x77, vcid=5, frame_size=512)


def test_space_packet_sequence_count_in_order_wrap(space_packet_framer_deframer, caplog):
    """In-order deframe at the 14-bit sequence count maximum wraps to zero without warning."""
    space_packet_framer_deframer.apid_to_sequence_count_map[APID] = WRAP_SEQ
    with caplog.at_level(logging.WARNING, logger="framing"):
        deframed, remaining, discarded = space_packet_framer_deframer.deframe(
            make_space_packet(APID, WRAP_SEQ, b"before_wrap")
        )
        assert deframed == b"before_wrap"
        assert remaining == b""
        assert discarded == b""
        assert len(caplog.records) == 0

        deframed, remaining, discarded = space_packet_framer_deframer.deframe(
            make_space_packet(APID, 0, b"after_wrap")
        )
        assert deframed == b"after_wrap"
        assert remaining == b""
        assert discarded == b""
        assert len(caplog.records) == 0

    assert space_packet_framer_deframer.apid_to_sequence_count_map[APID] == 1


def test_space_data_link_sequence_number_wrap(space_data_link_framer_deframer):
    """TM sequence number increments modulo 256 (255 -> 0)."""
    space_data_link_framer_deframer.sequence_number = (
        SpaceDataLinkFramerDeframer.SEQUENCE_NUMBER_MAXIMUM - 1
    )
    assert space_data_link_framer_deframer.get_sequence_number() == 255
    assert space_data_link_framer_deframer.get_sequence_number() == 0
    assert space_data_link_framer_deframer.sequence_number == 1