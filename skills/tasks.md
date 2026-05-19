---
name: tasks
version: 1
---

# Task Management

Manage to-do lists and tasks using taskwarrior, todo.txt format, or plain markdown files.

## When to use this skill

- User wants to capture, view, or complete tasks
- User asks "what do I need to do", "add a todo", "mark as done"
- User wants to prioritize or filter their task list
- User mentions "task", "todo", "to-do", "backlog", "next actions"

## Prerequisites

Check what's available:
```
which task 2>/dev/null   # taskwarrior
ls ~/todo.txt 2>/dev/null
ls ~/tasks.md 2>/dev/null
```

Preference order: taskwarrior > todo.txt > markdown file. If nothing exists, create `~/tasks.md`.

## Procedure

### Taskwarrior (preferred if installed)

**View tasks:**
```
task list
task next           # prioritized next actions
task due:today      # due today
task project:work   # filter by project
```

**Add tasks:**
```
task add "Write quarterly report" project:work due:friday priority:H
task add "Buy groceries" +personal
```

**Complete tasks:**
```
task 3 done         # complete task #3
```

**Modify tasks:**
```
task 3 modify due:tomorrow
task 3 modify priority:M
```

### todo.txt format

File lives at `~/todo.txt`. Format: `(A) 2024-06-15 Task description +project @context`

**View:** `cat ~/todo.txt | sort`
**Add:** append a line to `~/todo.txt`
**Complete:** move line to `~/done.txt` or prefix with `x YYYY-MM-DD`

### Markdown task file

Simple format in `~/tasks.md`:
```markdown
## Work
- [ ] Write quarterly report
- [x] Send invoice to client

## Personal
- [ ] Buy groceries
```

Read with `read_file`, update with `edit_file`.

## Output format

When listing tasks, group by project/context:
```
WORK
  [ ] Write quarterly report (due: Friday, high priority)
  [ ] Review PR from Alex

PERSONAL
  [ ] Buy groceries
  [ ] Call dentist
```

## Pitfalls

- Taskwarrior stores data in `~/.task/` — don't modify these files directly
- todo.txt: the priority field `(A)` must be at the start of the line to be recognized
- When no task system exists, ask the user which format they prefer before creating one

## Verification

After adding a task: list tasks and confirm it appears with the correct attributes.
After completing: list and confirm it's no longer in the pending list.
