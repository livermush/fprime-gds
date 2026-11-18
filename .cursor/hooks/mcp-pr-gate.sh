#!/bin/bash
# MCP PR gate (beforeMCPExecution + preToolUse). Fail-closed via hooks.json.
# Denies any MCP tool that creates, updates, or merges a pull request, on any
# server (GitHub MCP, connectors, plugins). PRs go through `gh pr create` only,
# where pr-gate.sh checks the AI disclosure and runs the CCSDS tests.
# Read-only PR tools (get/list/search/read) are allowed. Bash 3.2 safe (macOS).

INPUT="$(cat)"

# Tool name from either hook: beforeMCPExecution {"tool_name":"create_pull_request",...}
# or preToolUse {"tool_name":"MCP:create_pull_request",...}. Unparseable input: deny.
TOOL="$(printf '%s' "$INPUT" | python3 -c '
import json,sys
d=json.load(sys.stdin)
t=str(d.get("tool_name","") or "")
if t.startswith("MCP:"): t=t[4:]
print(t.lower())' 2>/dev/null)"
if [ $? -ne 0 ]; then
  echo "mcp-pr-gate: could not parse hook input" >&2
  exit 2
fi

reply() {  # permission, user_message, agent_message
  python3 -c 'import json,sys; d={"permission":sys.argv[1]}
if sys.argv[2]: d["user_message"]=sys.argv[2]
if sys.argv[3]: d["agent_message"]=sys.argv[3]
print(json.dumps(d))' "$1" "$2" "$3"
  exit 0
}

# preToolUse also fires for non-MCP tools when no matcher filters them; only judge MCP names.
case "$TOOL" in
  shell|read|write|grep|glob|delete|task|edit|ls|"") reply allow "" "" ;;
esac

# Is it about pull requests? (pull_request, pullrequest, pull-request, pr_*, *_pr, *_prs)
PRISH=0
printf '%s' "$TOOL" | grep -Eq 'pull[_-]?requests?|merge[_-]?requests?|(^|[_.:-])prs?($|[_.:-])' && PRISH=1
# Does it change something? (create/open/new/update/edit/merge/submit/reopen/close/push)
WRITEY=0
VERBS="$(printf '%s' "$TOOL" | sed -E 's/merge[_-]?requests?//g; s/pull[_-]?requests?//g')"
printf '%s' "$VERBS" | grep -Eq '(create|open|new|add|update|edit|merge|submit|reopen|close|push|write|patch)' && WRITEY=1

if [ "$PRISH" = 1 ] && [ "$WRITEY" = 1 ]; then
  reply deny \
    "MCP PR gate: blocked $TOOL. Open PRs only with gh pr create (AI_POLICY.md)." \
    "Blocked by the MCP PR gate hook: pull requests may not be created or changed through MCP or connector tools. Open PRs only with gh pr create (AI_POLICY.md rule 6), which runs the PR gate. If gh pr create was blocked, fix what the gate reported (for example add the IAMAI line) and retry with gh. Do not use the editor PR form, the GitHub web UI, or a compare link, and do not claim a route you did not use."
fi

reply allow "" ""
