#!/usr/bin/env bash
set -euo pipefail

PAYLOAD="$(cat)"
LOG_FILE=".cursor/audit/hook-audit.jsonl"
mkdir -p .cursor/audit

# Extract command from Cursor hook stdin JSON
CMD="$(python3 -c 'import sys, json; data = json.load(sys.stdin); print(data.get("command") or data.get("tool_input", {}).get("command", ""))' <<< "$PAYLOAD" 2>/dev/null || echo "")"

# Log every intercepted shell invocation for traceability
python3 -c 'import sys, json, datetime; print(json.dumps({"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(), "cmd": sys.argv[1]}))' "$CMD" >> "$LOG_FILE"

if [[ "$CMD" == *"gh pr create"* ]]; then
  if [[ "$CMD" != *"IAMAI"* ]]; then
    echo "POLICY GATE DENIED [AI_POLICY.md]: Pull request creation blocked. Missing required 'IAMAI' disclosure token and AI table row from .github/pull_request_template.md." >&2
    exit 2
  fi
fi

exit 0
