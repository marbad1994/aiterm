---
name: prepare-application
description: |
  Draft a tailored job application cover letter for a specific role using Marcus's embedded profile.
  Use when the user shares a job URL, job description, or job title and wants to apply or prepare an application.
  Trigger phrases: "apply for this job", "write a cover letter for", "prepare my application",
  "draft an application", "write application for", "apply to this", "cover letter for this role",
  "prepare application for job [N]".
  Also used internally by the daily-job-run skill to prepare applications for found roles.
tools:
  - WebSearch
  - mcp__workspace__web_fetch
  - Read
---

# Prepare application

Write a tailored cover letter for a specific job posting using Marcus's profile.

## Step 1 — fetch the job details

If given a URL, fetch the full job description. Extract:
- Role title and seniority level
- Company name and what they do (fetch the company homepage if needed for context)
- Key responsibilities
- Required tech stack
- Any explicit problem they're hiring to solve
- Team size / structure if mentioned
- Any culture signals (engineering blog, values page, etc.)

If given only a job title, ask for the URL or enough details to proceed.

## Step 2 — load the profile

Read `references/profile.md` for Marcus's full background, tone guide, and differentiators.

## Step 3 — assess the fit

Before writing, make a private honest fit assessment:
- Which of Marcus's experiences map directly to this role's requirements?
- Is there a specific project or capability that's unusually relevant? (lead with that)
- Are there any gaps? If yes, note them but don't mention them in the cover letter
- What problem is this company hiring to solve? Frame the letter around that

## Step 4 — write the cover letter

Follow the tone guide from `references/profile.md` strictly.

**Structure (3 paragraphs, ~200 words total):**

1. **Hook** — Acknowledge what the company is building / the problem they're hiring for. Show you understand their context, not just your own. One compelling sentence about why you're applying.

2. **Fit** — Connect 2-3 specific things from Marcus's background to their actual requirements. Be concrete. Name relevant projects, tech, or outcomes where possible. This is not a list of skills — it's a narrative of why he's the right person for this specific problem.

3. **Close** — Brief, confident. Express genuine interest, reference portfolio/LinkedIn, invite next step. No begging, no excessive formality.

**Format:**
```
[Role title] — [Company name]

[Paragraph 1]

[Paragraph 2]

[Paragraph 3]

Marcus Bader
https://marbad1994.github.io/ · https://linkedin.com/in/marcus-bader
```

## Step 5 — output

Present:
1. The full cover letter, ready to paste
2. A "Quick notes" section (2-3 bullets) covering:
   - Strongest angle in this application
   - Any gaps or watch-outs
   - Suggested subject line if applying by email
3. If there's a direct apply URL, show it

Do not ask for approval — produce the full letter immediately.
