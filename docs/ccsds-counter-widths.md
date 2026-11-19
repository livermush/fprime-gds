# CCSDS counter widths (flight vs ground)

Maintainers often confuse three independent counters on the CCSDS downlink path. Each has its own bit width and modulus. Ground code in **fprime-gds** must stay aligned with flight (**fprime**) without editing flight C++ from a ground task.

| Counter | Width | Modulus | Ground (fprime-gds) | Flight (read-only reference) |
|---------|-------|---------|---------------------|------------------------------|
| Space Packet APID sequence | 14-bit | **16384** (values 0–16383) | `SEQUENCE_COUNT_MAXIMUM` in `src/fprime_gds/common/communication/ccsds/space_packet.py` — in-sequence advance and gap resync in `deframe()` | `ApidManager::calculateNextSeqCount` (`fprime/Svc/Ccsds/ApidManager/`) |
| TM virtual channel frame | 8-bit | **256** | `VC_FRAME_COUNT_MAXIMUM` in `src/fprime_gds/common/communication/ccsds/space_data_link.py` — gap detection in `reassemble()` | `TmFramer` `m_virtualFrameCount++` (master count is flight-only; ground does not check it) |
| AOS VC frame | 24-bit (28 with cycle) | — | *(no GDS implementation)* | `AosDeframer` only (`fprime/Svc/Ccsds/`) |

## Space Packet sequence (14-bit)

Flight increments a per-APID counter modulo **16384** and places the value in the Space Packet primary header. On downlink, ground tracks the next expected count per APID using `SEQUENCE_COUNT_MAXIMUM`. A mismatch logs a gap warning and resynchronizes to `received + 1` (lost packets are assumed dropped in transit).

For an interactive walkthrough of rollover behavior after a drop near the end of the 14-bit range, see [docs/architecture/ccsds-flight-ground-boundary.canvas.tsx](architecture/ccsds-flight-ground-boundary.canvas.tsx).

## TM virtual channel frame count (8-bit)

TM transfer frames carry an 8-bit virtual channel frame count. Ground uses `VC_FRAME_COUNT_MAXIMUM` (**256**) when checking consecutive VC counts during multi-frame Space Packet `reassemble()`. Flight’s `TmFramer` maintains the authoritative master count; ground only observes the count in received frames.

## AOS (24-bit / 28-bit with cycle)

Advanced Orbiting Systems (AOS) transfer frames use a wider VC frame count (**24** bits, **28** with the cycle field). There is no AOS deframer in fprime-gds; parity for AOS is defined entirely in flight (`AosDeframer`).