# CCSDS counter widths (flight vs ground)

Short maintainer reference for how F Prime flight software and the GDS advance CCSDS-related counters. Flight FPP/C++ under `../fprime` (or `livermush/fprime`) is the wire contract; ground Python must stay in parity without editing flight code from ground tasks.

## Increment rule

All counters below follow:

```text
next = (count + 1) mod width
```

`width` is the number of distinct values the field can represent (for an *n*-bit field on the wire, valid encoded values are `0 … width - 1`, and `width = 2**n`).

## Ground counters

| Counter | Width | Flight reference | Ground reference | Notes |
| --- | ---: | --- | --- | --- |
| 14-bit Space Packet sequence count | 16384 (2¹⁴) | `fprime/Svc/Ccsds/Types/Types.fpp:72` (`SeqCountWidth = 14`); `fprime/Svc/Ccsds/ApidManager/ApidManager.cpp:58-59` (`calculateNextSeqCount`) | `src/fprime_gds/common/communication/ccsds/space_packet.py:32` (`SEQUENCE_COUNT_MAXIMUM`); `get_sequence_count` at `:111-113` | Per-APID on uplink (`frame`) and downlink (`deframe`). |
| 8-bit TM virtual channel frame count | 256 (2⁸) | `fprime/Svc/Ccsds/TmFramer/TmFramer.cpp:57-59` (master/virtual frame count wrap at 256) | `src/fprime_gds/common/communication/ccsds/space_data_link.py:33` (`VC_FRAME_COUNT_MAXIMUM`); loss check at `:228` | Compares consecutive TM frames in `reassemble`. |
| TC frame sequence number (`get_sequence_number`) | 256 (2⁸) | `fprime/Svc/Ccsds/TcDeframer/TcDeframer.cpp:90-91` (no TC-level sequence checks in Type-BD / bypass FARM) | `src/fprime_gds/common/communication/ccsds/space_data_link.py:28` (`SEQUENCE_NUMBER_MAXIMUM`); `get_sequence_number` at `:149-158` | Increment helper exists for symmetry; **not** used when building uplink TC frames. |

### Modulo vs gap resync (Space Packet)

- **Modulo paths:** `get_sequence_count()` advances with `% SEQUENCE_COUNT_MAXIMUM` (`space_packet.py:111-113`), matching flight `calculateNextSeqCount` (`ApidManager.cpp:58-59`).
- **Gap resync path:** On a sequence-count mismatch, `deframe()` sets the next expected count to `sp_header.seq_count + 1` without `% SEQUENCE_COUNT_MAXIMUM` (`space_packet.py:87-90`). That bare increment is the root cause of [#19](https://github.com/livermush/fprime-gds/issues/19) / task 1 ([#30](https://github.com/livermush/fprime-gds/issues/30)): after a gap at `16383`, internal state can become `16384`, so the next in-order packet at `0` logs a false warning. The fix is to wrap that resync assignment the same way as `get_sequence_count`.

**16384 must never appear as an expected sequence count.** Valid Space Packet sequence counts are `0 … 16383`. The constant `SEQUENCE_COUNT_MAXIMUM = 16384` is the modulus, not a value that can be encoded in the 14-bit field or printed as `expected:` in a warning.

### TC uplink framing

In bypass-FARM Type-BD mode, **TC `frame()` sends sequence byte 0** (`space_data_link.py:133-134`, comment at `:118`). Do not expect `get_sequence_number()` to advance the on-wire TC header today.

## Related material

- Interactive flight/ground boundary tour: `docs/architecture/ccsds-flight-ground-boundary.canvas.tsx`
- Regression guard: `test/fprime_gds/common/communication/ccsds/test_ccsds_counter_widths_doc.py`