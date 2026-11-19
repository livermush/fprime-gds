---
name: issue-reader
description: Read a GitHub issue for fprime-gds and brief the team. Use when asked to open, read, or summarize an issue, e.g. "/issue-reader open the latest issue" or "/issue-reader #4". Read-only: never edits code, comments, or changes the issue.
---

# /issue-reader: read the ticket, brief the team

Read-only. Do not edit files, comment on the issue, or change labels.

1. **Find the issue.** If a number is given, use it. If asked for the latest, run
   `gh issue list --repo livermush/fprime-gds --state open --limit 1 --json number,title,url`.
2. **Read it.** `gh issue view <N> --repo livermush/fprime-gds --json number,title,body,url,labels,createdAt`.
3. **Open it.** Open the issue's `url` in the Cursor browser so the team can see the page.
4. **Brief.** Reply with at most five short lines:
   - Issue number and title, with its link
   - The symptom, in one sentence, quoting the exact log line if the issue has one
   - Which side looks wrong (flight or ground) and why the issue says so
   - The constraints, as listed in the issue
   - One suggested next step (for example, plan it)

Quote only what the issue says. Do not guess at the cause or name files yet; that is the plan step's job.
