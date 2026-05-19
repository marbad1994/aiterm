---
name: notes
version: 1
---

# Notes & Knowledge Capture

Capture, search, and organize notes in plain text or markdown files.

## When to use this skill

- User wants to capture an idea, thought, or piece of information
- User wants to search their notes for something
- User wants to organize or link related notes
- User mentions "note", "write down", "remember this", "jot", "capture"

## Prerequisites

Notes live in a directory. Check:
```
ls ~/notes/ 2>/dev/null
ls ~/Documents/notes/ 2>/dev/null
ls ~/Obsidian/ 2>/dev/null   # Obsidian vault
```

If no notes directory exists, create `~/notes/` and use plain markdown files.

The format is plain markdown files — one file per topic or one daily note file. No special software required.

## Procedure

### Capture a quick note

Append to today's daily note:
```
echo "\n## $(date +%H:%M) — Quick note\n\nContent here" >> ~/notes/$(date +%Y-%m-%d).md
```

Or create a new topic file:
```
# Write content to ~/notes/topic-name.md
```

### Search notes

Full-text search across all notes:
```
grep -r "search term" ~/notes/
grep -rl "keyword" ~/notes/          # list matching files only
```

For better search with context:
```
grep -rn --include="*.md" "keyword" ~/notes/
```

### List recent notes
```
ls -lt ~/notes/*.md | head -20
```

### Organize notes by topic

Create subdirectories:
```
~/notes/
  work/
  personal/
  projects/
  reference/
  2024-01-15.md    # daily notes at root
```

### Link related notes

In markdown, reference other notes:
```markdown
See also: [[project-ideas]] or [project ideas](project-ideas.md)
```

### If user has Obsidian

Notes live in the vault directory. Plain markdown is compatible. Use the same grep-based search.

## Output format

When showing note content, render it cleanly. When showing search results:
```
Found "API design" in 3 notes:

~/notes/work/backend-project.md:12 — "API design should follow REST conventions..."
~/notes/2024-01-10.md:5 — "API design meeting notes from today..."
~/notes/reference/patterns.md:28 — "API design patterns: consider versioning..."
```

## Pitfalls

- Don't overwrite existing note files without reading them first
- Daily notes accumulate — suggest periodic review and archival after 90+ days
- Obsidian uses `[[wikilinks]]` — preserve this syntax if the user's vault uses it

## Verification

After capturing: read the file back and confirm the note appears with correct content and timestamp.
After searching: verify results are accurate before presenting them.
