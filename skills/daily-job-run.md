---
name: daily-job-run
description: |
  Run the full daily job search and application prep workflow. Finds 2-3 matching remote developer
  contractor roles, prepares tailored cover letters, updates the job tracker artifact, and presents
  the results for a quick review.
  Use when running the scheduled daily job search, or when the user asks to "run job search",
  "find jobs today", "start the daily job hunt", "do the daily run", "run jobs", or similar.
  This is the main skill invoked by the scheduled task.
tools:
  - WebSearch
  - mcp__workspace__web_fetch
  - mcp__cowork__update_artifact
  - mcp__cowork__create_artifact
  - mcp__cowork__list_artifacts
  - Read
---

# Daily job run

Execute the full daily workflow: search → filter → draft applications → update tracker → present for review.

Load the full workflow detail from `references/workflow.md` before proceeding.

## Quick summary of the flow

1. **Search** — Run the find-jobs skill logic (or call it directly). Target 2-3 high-quality matches. Do not present more than 3; quality over quantity.

2. **Draft** — For each match, run the prepare-application skill logic to produce a tailored cover letter. Do this for all matches before presenting anything.

3. **Update tracker** — Add all matches to the job tracker artifact with status "pending review". See `references/workflow.md` for the artifact data schema.

4. **Present** — Show all 3 results in one clean summary. For each job:
   - Role title + company (with link)
   - 1-sentence match rationale
   - The full cover letter, ready to copy
   - Direct apply link if available

5. **Prompt for action** — After presenting, ask: "Ready to send any of these? Say 'apply [1/2/3]' and I'll open the application page, or 'skip all' to log these as reviewed."

## Important constraints

- Never submit an application without the user explicitly saying to apply for a specific job
- Do not apply to the same company twice within 30 days — check the tracker artifact before including a result
- If fewer than 2 good matches are found, say so rather than padding with poor fits
- Log every run to the tracker, even if no applications are sent
