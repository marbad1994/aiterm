---
name: task-management
version: 1
---

# Task Management

Track tasks in `TASKS.md` at the workspace root. shmakk's planner writes plans here automatically, but the agent should also read and update this file when the user asks about tasks or commitments.

## When to use this skill

- User asks "what's on my plate", "my tasks", "what am I working on"
- User says "add a task", "remind me to", "I need to remember to"
- User says "done with X", "finished X", "completed X"
- User wants to track a commitment, deadline, or follow-up
- A plan finishes and you want to summarize what's now in Active vs. Done

## File location

`TASKS.md` in the **workspace root**. Create it if it doesn't exist.

## Format

```markdown
# Tasks

## Active

**[plan title]**
- [ ] **Task title** — context / description
- [ ] **Another task** — why this matters

## Waiting On

## Someday

## Done
- [x] ~~**Old task**~~ (Jan 15)
```

Task format:
- `- [ ] **Bold title** — short description / context`
- Sub-bullets for extra detail (acceptance criteria, links, owner)
- Completed: `- [x] ~~**Title**~~ (date)`

## How to interact

**"What's on my plate?" / "show my tasks":**
1. Use `read_file TASKS.md`
2. Summarize Active and Waiting On sections
3. Highlight anything marked overdue or urgent
4. Mention recent Done items if asked about progress

**"Add a task to X":**
1. Read current TASKS.md (create from template if missing)
2. Append to Active section with `- [ ] **Title** — context`
3. Include "for [person]" if it's a commitment
4. Include "due [date]" if there's a deadline
5. Use `edit_file` to add the line — don't rewrite the whole file

**"Done with X" / "finished X":**
1. Read TASKS.md, find the matching task in Active
2. Change `- [ ] **X** — context` to `- [x] ~~**X**~~ (today's date)`
3. Move the line to the Done section
4. Use `edit_file` for the change

**"What am I waiting on?":**
- Read the Waiting On section
- Note how long each item has been waiting (if `since` metadata is present)

## Conventions

- **Bold** the task title for scannability
- Add "for [person]" when it's a commitment to someone
- Add "due [date]" for deadlines
- Add "since [date]" for waiting items
- Keep the Done section pruned — entries older than 1 week can be removed

## Extracting tasks from conversation

When the user describes work but doesn't explicitly say "add a task":
- Identify commitments ("I'll send that over")
- Identify action items assigned to them
- Identify follow-ups they mentioned
- **Ask before adding** — never auto-add without confirmation

## How shmakk's planner writes here

When `shouldPlan()` triggers and a plan is approved, shmakk writes all plan tasks to the Active section under a `**Plan title**` heading. As each task completes, it moves to Done with a date. As tasks are skipped, they get a `~~skipped~~` annotation but stay in Active. You can edit this file freely between plans — the planner won't clobber unrelated entries.
