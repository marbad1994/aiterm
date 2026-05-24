---
name: find-jobs
description: |
  Search job boards for remote developer contractor/freelance roles that are open to EU-based (Romania) candidates.
  Use when the user asks to find jobs, search for work, look for developer positions, contractor roles, or freelance opportunities.
  Trigger phrases: "find jobs", "search for jobs", "look for developer jobs", "find remote work", "search contractor roles",
  "find freelance positions", "what jobs are available", "run job search".
  Also used internally by the daily-job-run skill.
tools:
  - WebSearch
  - mcp__workspace__web_fetch
---

# Find jobs

Search for remote developer/contractor roles matching the user's profile. Return the top 5 best-fit results with enough detail to evaluate and apply.

## Search strategy

Run searches across multiple sources. Vary the query phrasing across searches to avoid redundant results.

Search queries to run (pick 4-6, rotate between sessions):
- `remote senior full-stack developer contractor Europe 2024 site:linkedin.com`
- `remote full-stack engineer contract EU timezone React Node.js`
- `remote senior developer freelance Romania Europe contractor`
- `tech lead full-stack remote contract Europe site:weworkremotely.com`
- `senior software engineer contractor remote EU React Next.js Node`
- `full-stack developer remote contract AI startup Europe`
- `senior developer contractor remote Europe site:remoteok.com`
- `Next.js Node.js contractor remote Europe senior engineer`
- `senior full-stack contract remote EU site:arc.dev`
- `tech lead remote contract React Node Europe site:toptal.com`

Also check these boards directly if search results are thin:
- https://weworkremotely.com/categories/remote-programming-jobs
- https://remoteok.com/remote-senior-developer-jobs
- https://arc.dev/remote-jobs
- https://www.linkedin.com/jobs/search/?keywords=senior+full-stack+contractor+remote&f_WT=2

## Filtering criteria

Load the full criteria from `references/job-search-criteria.md`.

Quick filters — exclude a result if:
- Listed as "full-time permanent employee" only (no contractor/freelance variant)
- Requires physical presence in a specific office
- Timezone explicitly limited to US/Americas only
- Listed salary/rate is below €60/hr or €8,000/month equivalent
- Clearly entry-level or junior

Prefer results that:
- Mention EU timezone, CET/EET, or "Europe" in timezone requirements
- Are contract, freelance, part-time, or have contract-to-hire options
- Involve tech stack overlapping with profile: React, Next.js, Node.js, Python, PostgreSQL, AWS, Docker, AI/LLM
- Are from product companies or funded startups (over pure outsourcing shops)

## Output format

Return a numbered list of up to 5 results. For each:

```
## [N]. [Role title] — [Company]
- Source: [URL]
- Type: Contract / Freelance / Contract-to-hire
- Rate/Salary: [if listed, otherwise "not specified"]
- Timezone: [requirement, or "flexible" if not stated]
- Tech: [relevant stack mentioned]
- Match: [1-2 sentence honest assessment of fit vs the profile]
- Apply: [direct application URL if different from source]
```

After the list, add a short "Best bet today" note naming the single strongest match and why.

## Notes

- If a URL requires JavaScript to render, note it and try to fetch the text version or a cached version.
- Do not fabricate job listings. If fewer than 3 results pass the filters, say so and list what was found.
- Date-check results where possible — flag listings older than 30 days.
