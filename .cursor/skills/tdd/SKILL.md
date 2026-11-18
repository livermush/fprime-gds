---
name: tdd
description: Test-first bug fix loop for fprime-gds. Use when asked to fix an issue or bug in this repo, e.g. "/tdd fix issue #4". Reads the ticket, checks flight as read-only truth, proves the bug with a failing pytest, then makes the smallest fix.
---

# /tdd: prove it red, fix it, prove it green

Work in this order. Do not skip or reorder steps.

1. **Read the ticket.** `gh issue view <N> --repo livermush/fprime-gds`. Restate the bug in one sentence.
2. **Read flight first (read-only).** Find the matching behavior in the sibling `../fprime` checkout (FPP models and C++ under `Svc/`). Quote the file and line that defines the correct behavior. Never edit anything in `../fprime`.
3. **Find the ground code** that diverges from flight. Quote the file and line.
4. **Write one failing regression test** (test file only; do not edit source until step 6) next to the existing tests for that module. Use the existing fixtures and helpers. The test must describe the scenario from the ticket and assert on observable behavior (return values, log records).
5. **Show it red.** Run only that test with `.venv/bin/python -m pytest <path>::<test> -q` and show the failure output. If it passes, the test does not reproduce the bug: rewrite it before touching source.
6. **Make the smallest fix.** Change as few lines as possible. Reuse existing constants and helpers instead of new literals. No refactors, no new dependencies, and never change existing log or error strings.
7. **Show it green.** Re-run the new test, then the whole test folder for that module (not just the one file), e.g. `.venv/bin/python -m pytest test/fprime_gds/common/communication/ccsds -q`.
8. **Report.** List files changed, the red and green commands with their real output, and the flight file:line you matched. Only report tests you actually ran.

Do not commit, push, or open a PR in this skill. The user asks for that separately.
