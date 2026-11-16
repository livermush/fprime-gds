# fprime-gds Agent Instructions

This repository is the Python Ground Data System (GDS) paired with the F Prime (`fprime`) flight software framework.

## Core Standards
- **Flight Contract Authority:** Flight FPP models and C++ implementations in `fprime` (e.g., `Svc/Ccsds/ApidManager`) define the authoritative CCSDS wire protocol. Ground code must stay in parity with flight without modifying flight C++ during ground triage.
- **Minimal Diffs:** Follow the `fprime-maintenance` skill whenever modifying existing code. Keep changes surgical, reuse existing constants (such as `SEQUENCE_COUNT_MAXIMUM`), and never alter existing warning/error log strings asserted by unit tests.
- **Test-First Verification:** Every bug fix requires a `pytest` regression test that fails prior to the fix and passes afterward.
- **AI Governance:** All pull requests must comply with the organization's `AI_POLICY.md` disclosure rules.
- **Ownership & Repos:** We own `fprime-gds`; the flight team owns `fprime`. Issues and PRs go only to `livermush/fprime-gds` (ours) or `livermush/fprime` (flight team). Always pass `--repo` to `gh`. Never target `nasa/*`. Request flight changes with an issue (and PR if asked) to the flight team; never edit flight code from a ground task.
- **Running Tests:** Run tests with `.venv/bin/python -m pytest` (the system `python3` has no pytest). Only report a test run in a PR if it actually ran.
