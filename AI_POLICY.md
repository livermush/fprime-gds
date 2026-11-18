# AI Contribution Policy

Applies to every pull request where an AI agent wrote or changed code.

1. **Disclosure token.** The PR title or body must contain the exact token `IAMAI`, passed inline with `--title`/`--body` (not `--body-file`) so the gate can see it. Put it in the body as: `IAMAI: this change was written with an AI agent and reviewed by a human.`
2. **Tests that actually ran.** The PR body lists the test command and its result. Never claim a test you did not run.
3. **Repo targeting.** Every `gh` command passes `--repo`. Ground changes go to `livermush/fprime-gds`; flight requests go to `livermush/fprime`. Never target `nasa/*`.
4. **Branching.** Commit the change on a new branch (`fix/issue-<N>-<short-name>`), push that branch, and open the PR from it against `devel`. Never commit or push directly to `devel`. (Cursor cloud agents may keep their `cursor/...` branch name.)
5. **Human merge.** An agent may open a PR. A human reviews and merges it.
6. **Locally, PRs only through `gh pr create`.** In a local session, open pull requests only with `gh pr create`, so the gate runs. Never create, update, or merge a PR through MCP or GitHub connector tools, the editor's PR form or Create PR button, the GitHub web UI, or a compare link, and never suggest those as a way around a blocked `gh pr create`. If the gate blocks you, fix what it reports (for example, add the `IAMAI` line) and retry with `gh`. A request for an exact title or body does not override this policy: keep the requested wording and append the disclosure line. Report only the route you actually used; never claim `gh` if you used something else.
7. **Cursor cloud agents.** A cloud agent (started from an `@cursor` comment, the Agents Window, or the API) does not open the PR itself: commit, push its branch, and write the PR description, and Cursor opens the PR from it. That description must still meet rules 1 and 2 and say `Closes #<sub-issue>`. Do not try `gh pr create` or any other route from the cloud; if no PR is going to be opened for you, stop and report.

Enforced by `.cursor/hooks/pr-gate.sh`: `gh pr create` is blocked unless the token is present and the CCSDS test suite passes. `.cursor/hooks/mcp-pr-gate.sh` blocks PR-writing MCP tools, so rule 6 is enforced too. The same hooks run in Cursor cloud agents on every shell command.
