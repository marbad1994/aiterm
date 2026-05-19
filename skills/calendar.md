---
name: calendar
version: 1
---

# Calendar & Scheduling

Manage calendar events, check schedules, and plan time using local ical files or CLI calendar tools.

## When to use this skill

- User asks about upcoming events, meetings, or appointments
- User wants to schedule, move, or cancel an event
- User wants to see today's or this week's agenda
- User wants to find a free slot for a meeting
- User mentions "calendar", "schedule", "meeting", "appointment", "agenda"

## Prerequisites

One of the following should be available:
- `khal` — CLI calendar (works with CalDAV/ical files), configured via `~/.config/khal/config`
- `calcurse` — terminal calendar app, data in `~/.local/share/calcurse/`
- Raw ical files (`.ics`) synced to a local directory (e.g. via `vdirsyncer`)
- `gcalcli` — Google Calendar CLI, requires OAuth setup

Check availability: `which khal calcurse gcalcli 2>/dev/null`

## Procedure

### Reading the current schedule

With khal:
```
khal list today
khal list today 7d
khal calendar
```

With calcurse: launch `calcurse -D ~/.local/share/calcurse` and read output.

With gcalcli:
```
gcalcli agenda
gcalcli calw   # week view
```

With raw ical: find and parse `.ics` files in `~/.calendars/` or wherever they're synced.

### Adding an event

With khal:
```
khal new 2024-06-15 14:00 15:00 "Team standup" :: "Weekly sync with engineering"
```

With gcalcli:
```
gcalcli add
```

### Finding free time

Check khal list output for gaps between events. A gap > 30 minutes between events is schedulable.

### Editing or removing an event

With khal: use `khal edit` to interactively modify.
With gcalcli: `gcalcli delete "event title"`

## Output format

When showing the schedule, present it as a clean list:
```
Today — Tuesday, June 15

 9:00 – 10:00  Team standup
12:00 – 13:00  Lunch with client
15:00 – 16:00  Design review

No events found for tomorrow.
```

When suggesting a meeting time, offer 2-3 options based on visible free slots.

## Pitfalls

- `khal` requires CalDAV sync to be up-to-date — suggest running `vdirsyncer sync` if events seem stale
- Time zone issues: verify `khal` is configured with the correct timezone in `~/.config/khal/config`
- `gcalcli` needs OAuth; if it fails, prompt the user to run `gcalcli init` first
- Don't assume the calendar tool is installed — check first and fall back gracefully

## Verification

After adding an event: run `khal list [date]` and confirm the event appears with correct time and title.
