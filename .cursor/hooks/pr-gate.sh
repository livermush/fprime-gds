#!/bin/bash
# PR gate (beforeShellExecution). Fail-closed via hooks.json.
# Blocks `gh pr create` unless the AI disclosure token is present
# and the CCSDS pytest suite passes. Bash 3.2 safe (macOS).

TOKEN="IAMAI"
TESTS="test/fprime_gds/common/communication/ccsds"

ROOT="${CURSOR_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
INPUT="$(cat)"

COMMAND="$(printf '%s' "$INPUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("command",""))' 2>/dev/null)"
if [ $? -ne 0 ]; then
  echo "pr-gate: could not parse hook input" >&2
  exit 2
fi

reply() {  # permission, user_message, agent_message
  python3 -c 'import json,sys; d={"permission":sys.argv[1]}
if sys.argv[2]: d["user_message"]=sys.argv[2]
if sys.argv[3]: d["agent_message"]=sys.argv[3]
print(json.dumps(d))' "$1" "$2" "$3"
  exit 0
}

# Not a PR create: allow (the matcher normally filters these out).
if ! printf '%s' "$COMMAND" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+create'; then
  reply allow "" ""
fi

# Rule 1: AI disclosure token.
if ! printf '%s' "$COMMAND" | grep -q "$TOKEN"; then
  reply deny \
    "PR gate: blocked, AI disclosure token missing (see AI_POLICY.md)." \
    "Blocked by the PR gate hook: the gh pr create command is missing the required AI disclosure. Read AI_POLICY.md and retry gh pr create with the IAMAI line added to --body (keep any requested wording, then append it). Do not open the PR another way (MCP or connector tools, the editor PR form, the web UI, or a compare link)."
fi

# Rule 2: CCSDS tests must pass. Run them; never trust a claim.
PY="$ROOT/.venv/bin/python"
if [ ! -x "$PY" ]; then
  reply deny "PR gate: blocked, $PY not found." \
    "Blocked by the PR gate hook: the test environment .venv is missing, so tests could not run."
fi
OUT="$(cd "$ROOT" && "$PY" -m pytest "$TESTS" -q 2>&1)"
if [ $? -ne 0 ]; then
  TAIL="$(printf '%s\n' "$OUT" | tail -n 15)"
  reply deny "PR gate: blocked, CCSDS tests failed." \
    "Blocked by the PR gate hook: $TESTS failed. Fix the failures, then retry. Output tail:
$TAIL"
fi

SUMMARY="$(printf '%s\n' "$OUT" | tail -n 1)"
reply allow "PR gate: passed (token present; CCSDS tests: $SUMMARY)." ""
