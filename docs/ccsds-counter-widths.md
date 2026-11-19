# CCSDS counter widths (flight vs ground)

Short maintainer reference for how **fprime** (flight) and **fprime-gds** (ground) advance CCSDS-related counters. Flight FPP/C++ is the wire contract; ground must stay in parity.

For an interactive walkthrough of the 14-bit packet-sequence rollover bug, see `docs/architecture/ccsds-flight-ground-boundary.canvas.tsx`.

## Increment rule

All counters in this note follow:

```text
next = (count + 1) mod width
```

`width` is the number of **distinct values** the field can hold (not the maximum encoded value). Examples:

| Bits | `width` | Valid counts on the wire |
|------|---------|--------------------------|
| 14 (packet sequence) | `2^14` = **16384** | `0` … `16383` |
| 8 (TM VC frame count, unused TC sequence helper) | `2^8` = **256** | `0` … `255` |

**Never treat `16384` as a sequence count.** The 14-bit Space Packet sequence field cannot represent it; a ground “expected: 16384” warning is always a bookkeeping bug, not a valid CCSDS value.

## Ground counters (table)

Flight paths are under `livermush/fprime`; ground paths are in this repo.

| Counter | Width | Flight reference | Ground reference | Modulo on advance? | Notes |
|---------|-------|------------------|------------------|--------------------|-------|
| **Per-APID Space Packet sequence** (uplink `frame()`, downlink `deframe()` check) | 14 (`width` 16384) | `Svc/Ccsds/Types/Types.fpp` — `SpacePacketSubfields.SeqCountWidth` (= 14); `Svc/Ccsds/ApidManager/ApidManager.cpp` — `getAndIncrementSeqCount`, `calculateNextSeqCount` | `src/fprime_gds/common/communication/ccsds/space_packet.py` — `SEQUENCE_COUNT_MAXIMUM`, `get_sequence_count`, `deframe` | **Yes** on normal increment via `get_sequence_count` | After a **gap resync** in `deframe`, ground sets the next expected count to `received + 1` **without** `% SEQUENCE_COUNT_MAXIMUM` (see [task-1 resync gap](#task-1-resync-gap)). Flight resync uses `calculateNextSeqCount` (modulo). |
| **TM Virtual Channel frame count** (loss detection in `reassemble`) | 8 (`width` 256) | `Svc/Ccsds/TmFramer/TmFramer.cpp` — `m_virtualFrameCount` (U8 wrap); `Svc/Ccsds/Types/Types.fpp` — `TMHeader.virtualFrameCount` | `src/fprime_gds/common/communication/ccsds/space_data_link.py` — `VC_FRAME_COUNT_MAXIMUM`, `deframe` / `reassemble` | **Yes** — `(last_vc_count + 1) % VC_FRAME_COUNT_MAXIMUM` | `255` → `0` is valid continuity, not loss (`test_deframe_spanning_vc_count_wrap` in `test_space_data_link.py`). |
| **`get_sequence_number`** on `SpaceDataLinkFramerDeframer` | 8 (`width` 256) | N/A (TC Type-BD: frame sequence not checked; see `TcDeframer.cpp` comments) | `space_data_link.py` — `get_sequence_number` | **Yes** if called | **Unused** in production: no callers in fprime-gds. Uplink `frame()` hard-codes TC header sequence byte **0** (bypass FARM). |

## Flight file:line map

| Topic | Location |
|-------|----------|
| 14-bit sequence width | `fprime/Svc/Ccsds/Types/Types.fpp` — `constant SeqCountWidth = 14` |
| Per-APID seq: return current, store next with modulo | `fprime/Svc/Ccsds/ApidManager/ApidManager.cpp` — `getAndIncrementSeqCount` (lines 45–56), `calculateNextSeqCount` (lines 58–60) |
| Downlink gap: resync onboard count with modulo | `ApidManager.cpp` — `validateApidSeqCountIn_handler` (lines 25–34), `calculateNextSeqCount(receivedSeqCount)` on mismatch |
| Stamp seq in TM Space Packet header | `fprime/Svc/Ccsds/SpacePacketFramer/SpacePacketFramer.cpp` — `sequenceCount` from `getApidSeqCount_out` (lines 73–79) |
| TM VC frame count advance (mod 256) | `fprime/Svc/Ccsds/TmFramer/TmFramer.cpp` — `set_virtualFrameCount`, then `m_virtualFrameCount++` (lines 57–61) |
| TC frame sequence field unused (Type-BD) | `fprime/Svc/Ccsds/TcDeframer/TcDeframer.cpp` — header comment (line 51); no FARM / seq check (lines 92–93) |

## Ground file:line map

| Topic | Location |
|-------|----------|
| 14-bit width constant | `space_packet.py` line 32 — `SEQUENCE_COUNT_MAXIMUM = 16384` |
| Uplink framing uses per-APID count | `space_packet.py` lines 50–54 — `get_sequence_count` in `frame` |
| Normal increment with modulo | `space_packet.py` lines 111–113 — `(sequence + 1) % self.SEQUENCE_COUNT_MAXIMUM` |
| Downlink gap warning + resync | `space_packet.py` lines 80–90 — compare to `get_sequence_count`, then `sp_header.seq_count + 1` on mismatch |
| TC uplink: sequence byte fixed 0 | `space_data_link.py` lines 133–135 — `header_val3_u8 = 0` |
| Unused TM-side sequence helper | `space_data_link.py` lines 149–159 — `get_sequence_number` |
| VC frame count modulus | `space_data_link.py` line 33 — `VC_FRAME_COUNT_MAXIMUM = 256`; line 228 — loss check uses `% self.VC_FRAME_COUNT_MAXIMUM` |

## Task-1 resync gap

Parent issue **#19** / sub-issue **#24** (*task 1*): after a dropped packet near 14-bit rollover, ground can log `received sequence count: 0 (expected: 16384)` because `deframe` resync leaves the internal map at `16384` instead of wrapping to `0`.

| Path | Behavior |
|------|----------|
| In-order advance (`get_sequence_count`) | Modulo — matches flight `calculateNextSeqCount` |
| Gap resync (`deframe`, lines 88–89) | **`seq_count + 1` without modulo** — diverges from flight until task 1 fixes it |

Tasks 2 and 3 of #19 are intentionally separate (audit tests and this doc).

## Related ground tests (not exhaustive)

| Behavior | Test |
|----------|------|
| Gap warning + resync (generic) | `test_space_packet.py` — `test_deframe_sequence_count_warning` |
| VC count `255` → `0` | `test_space_data_link.py` — `test_deframe_spanning_vc_count_wrap` |
| Rollover after gap (task 1) | Added in #24 — not documented here as a line reference until that PR lands |