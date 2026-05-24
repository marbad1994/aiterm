---
name: research
version: 1
category: research
---

# Research & Information Synthesis

Conduct systematic research using web search, source evaluation, and structured synthesis.

## When to use this skill

- User wants to research a topic, person, company, technology, or concept
- User wants to compare options or understand tradeoffs
- User asks "what is", "how does", "who is", "what are the options for"
- User wants to verify a claim or find authoritative sources
- User needs a summary or briefing on an unfamiliar topic

## Procedure

### Step 1: Clarify the research goal

Before searching, identify:
- What decision or question is this research serving?
- What depth is needed (quick overview vs. deep analysis)?
- What sources count as authoritative for this domain?
- Are there time constraints (recent information only)?

### Step 2: Initial broad search

Start with 2-3 broad queries to map the landscape:
```
web_search("topic overview")
web_search("topic best practices 2024")
web_search("topic pros cons tradeoffs")
```

Note the key subtopics, terminology, and major sources that appear repeatedly.

### Step 3: Targeted deep search

Follow up with specific queries on the most important subtopics:
```
web_search("specific aspect of topic site:authoritative-source.com")
web_search("\"exact phrase from domain\" technical details")
```

For technical topics: search GitHub, official docs, academic papers.
For business topics: search official company sites, industry reports, Crunchbase.
For legal/regulatory: search official government sources and established law firms.

### Step 4: Fetch and read key sources

Retrieve full content from the most relevant pages:
```
fetch_url("https://authoritative-source.com/relevant-article")
```

Prioritize: official documentation > peer-reviewed or established publications > reputable news > general web.

### Step 5: Evaluate source quality

For each source, assess:
- **Authority**: Who wrote it? What are their credentials?
- **Currency**: When was it published/updated? Is it still relevant?
- **Accuracy**: Are claims supported by evidence or citations?
- **Bias**: Does the source have a commercial or ideological interest?

Flag low-quality or potentially biased sources explicitly.

### Step 6: Synthesize findings

Structure the synthesis:
1. **Core answer** — direct answer to the research question
2. **Key findings** — the most important facts, data, or insights
3. **Nuances and caveats** — important exceptions, context, or disagreements
4. **Gaps** — what the research didn't find, areas of uncertainty
5. **Sources** — list of references used

### Step 7: Save findings (if appropriate)

For substantial research, save to a notes file:
```
~/notes/research/topic-YYYY-MM-DD.md
```

## Output format

**Quick briefing:**
```
## [Topic] — Research Summary

**Bottom line:** [one-sentence direct answer]

**Key findings:**
- Finding 1 (source)
- Finding 2 (source)
- Finding 3 (source)

**Caveats:** [important limitations or uncertainties]

**Sources:** [list of URLs or publications]
```

**Deep analysis:** expand each section with detail, quotes, and comparative analysis.

## Pitfalls

- Don't present the first search result as authoritative without checking it
- Avoid confirmation bias — actively search for counterarguments and contrary evidence
- Distinguish between fact, expert opinion, and speculation
- For medical, legal, or financial topics: always note that a qualified professional should be consulted
- "Recent" news may be outdated — check publication dates
- Wikipedia is good for orientation but not a primary source for important claims

## Verification

Confirm key facts appear in at least two independent sources before presenting them as established.
If findings conflict across sources, surface the disagreement rather than picking one.
