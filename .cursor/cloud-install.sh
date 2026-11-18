#!/usr/bin/env bash
# Cursor cloud agent install script (runs at Build time; must be idempotent).
# Gives the cloud VM the same two-folder layout as the laptop:
#   <parent>/fprime-gds  (this repo, with .venv)   <parent>/fprime  (flight source, read-only reference)
set -euo pipefail
cd "$(dirname "$0")/.."
chmod +x .cursor/hooks/*.sh 2>/dev/null || true   # hooks must stay executable even if a web/API commit dropped the bit
# 1. Flight source next to the repo, so ../fprime/Svc/Ccsds/... resolves like on the laptop.
[ -d ../fprime/.git ] || git clone -q --depth 1 --branch devel https://github.com/livermush/fprime.git ../fprime
# 2. Python venv. The stock image may lack python3-venv, so fall back to virtualenv.
if [ ! -x .venv/bin/pip ]; then
  rm -rf .venv
  if ! python3 -m venv .venv 2>/dev/null || [ ! -x .venv/bin/pip ]; then
    rm -rf .venv
    python3 -m pip install -q --user virtualenv 2>/dev/null || python3 -m pip install -q --user --break-system-packages virtualenv
    python3 -m virtualenv -q .venv
  fi
fi
.venv/bin/pip install -q -e . pytest
# 3. Prove it: the CCSDS suite must pass on a clean checkout.
.venv/bin/python -m pytest test/fprime_gds/common/communication/ccsds -q
