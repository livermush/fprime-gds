# CCSDS counters: flight authority and ground parity

This note records which CCSDS counters the GDS tracks on downlink (and uplink framing where applicable), how each counter must wrap, and where flight behavior is defined. Flight FPP models and C++ in the sibling [`fprime`](https://github.com/livermush/fprime) repository are the contract; ground code in `fprime-gds` must stay in parity without editing flight sources from a ground task.

Related work: [#4](https://github.com/livermush/fprime-gds/issues/4) (false sequence-count warning at 14-bit rollover after a dropped packet).

## Space Packet sequence count (14 bits)

| | |
| --- | --- |
| **Wire field** | `packetSequenceControl` low 14 bits (Space Packet primary header) |
| **Valid range** | `0` … `16383` (`2^14 - 1`) |
| **Wrap rule** | After the maximum value, the next count is `0` (modulo `2^14`, i.e. `16384`) |

**Flight authority**

- Width: `SeqCountWidth = 14` in `Svc/Ccsds/Types/Types.fpp` (FPP module `SpacePacketSubfields`).
- Increment and wrap: `ApidManager::calculateNextSeqCount` in `Svc/Ccsds/ApidManager/ApidManager.cpp` uses `(seqCount + 1) % (1 << SpacePacketSubfields::SeqCountWidth)`.

**Ground implementation**

- Constant: `SpacePacketFramerDeframer.SEQUENCE_COUNT_MAXIMUM = 16384` in `src/fprime_gds/common/communication/ccsds/space_packet.py`.
- Per-APID tracking: `get_sequence_count()` returns the current count and advances with `% SEQUENCE_COUNT_MAXIMUM`.
- After a mismatch, ground resynchronizes to the received value; the *next* expected count must use the same modulo wrap as flight, not bare `received + 1` (which breaks at rollover and was the root of [#4](https://github.com/livermush/fprime-gds/issues/4)).

Flight file:line references:

- `../fprime/Svc/Ccsds/Types/Types.fpp:72` — `SeqCountWidth = 14` (module `SpacePacketSubfields`).
- `../fprime/Svc/Ccsds/ApidManager/ApidManager.cpp:59-61` — `calculateNextSeqCount`.

## TM Virtual Channel frame count (8 bits)

| | |
| --- | --- |
| **Wire field** | `virtualFrameCount` in the TM transfer frame primary header (`U8`) |
| **Valid range** | `0` … `255` |
| **Wrap rule** | After `255`, the next count is `0` (modulo `256`) |

A transition from `255` to `0` is a normal wrap, not frame loss.

**Flight authority**

- Field width: `virtualFrameCount: U8` on `TMHeader` in `Svc/Ccsds/Types/Types.fpp`.
- Increment: `TmFramer` stores the current count in the header, then post-increments `m_virtualFrameCount` as an 8-bit value that wraps at 256 (same for `m_masterFrameCount` in the single-VC configuration used today).

**Ground implementation**

- Constant: `SpaceDataLinkFramerDeframer.VC_FRAME_COUNT_MAXIMUM = 256` in `src/fprime_gds/common/communication/ccsds/space_data_link.py`.
- Loss detection: `reassemble()` treats the next frame as in sequence when `vc_count == (last_vc_count + 1) % VC_FRAME_COUNT_MAXIMUM`.

Flight file:line references:

- `../fprime/Svc/Ccsds/Types/Types.fpp:140` — `TMHeader.virtualFrameCount` (`U8`).
- `../fprime/Svc/Ccsds/TmFramer/TmFramer.cpp:56-61` — emit current `virtualFrameCount`, then increment with 8-bit wrap.

## Maintainer checklist

1. Read flight first for counter width and wrap semantics; do not invent new literals when an existing constant (`SEQUENCE_COUNT_MAXIMUM`, `VC_FRAME_COUNT_MAXIMUM`, or flight-generated `SeqCountWidth`) already expresses the contract.
2. When changing resync or gap-handling logic, add or extend a test under `test/fprime_gds/common/communication/ccsds/` that covers rollover (14-bit sequence and 8-bit VC frame count).
3. Never change existing warning or error log strings asserted by unit tests unless the ticket explicitly requires it.

## See also

- Interactive boundary overview: `docs/architecture/ccsds-flight-ground-boundary.canvas.tsx`
- Repo agent rules: `AGENTS.md`