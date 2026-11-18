# AI Contribution Policy

Applies to every pull request where an AI agent wrote or changed code.

1. **Disclosure token.** The PR title or body must contain the exact token `IAMAI`, passed inline with `--title`/`--body` (not `--body-file`) so the gate can see it. Put it in the body as: `IAMAI: this change was written with an AI agent and reviewed by a human.`
2. **Tests that actually ran.** The PR body lists the test command and its result. Never claim a test you did not run.
3. **Repo targeting.** Every `gh` command passes `--repo`. Ground changes go to `livermush/fprime-gds`; flight requests go to `livermush/fprime`. Never target `nasa/*`.
4. **Branching.** Commit the change on a new branch (`fix/issue-<N>-<short-name>`), push that branch, and open the PR from it against `devel`. Never commit or push directly to `devel`.
5. **Human merge.** An agent may open a PR. A human reviews and merges it.

Enforced by `.cursor/hooks/pr-gate.sh`: `gh pr create` is blocked unless the token is present and the CCSDS test suite passes.
