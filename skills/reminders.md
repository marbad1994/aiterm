---
name: reminders
version: 1
category: productivity
---

# Reminders & Notifications

Set one-time and recurring reminders using system tools.

## When to use this skill

- User wants to be reminded about something at a specific time
- User wants to set an alarm or alert
- User mentions "remind me", "alert", "don't forget", "set a reminder"

## Prerequisites

```
which at notify-send crontab 2>/dev/null
systemctl is-active atd 2>/dev/null    # at daemon must be running
```

- `at` — one-time scheduled tasks. Requires `atd` service to be running.
- `notify-send` — desktop notification (requires libnotify-bin; works in most Linux desktop environments)
- `cron` — recurring reminders

If `atd` isn't running: `sudo systemctl enable --now atd`

## Procedure

### One-time reminder (at + notify-send)

```
echo "notify-send 'Reminder' 'Team standup in 5 minutes'" | at 09:55 today
echo "notify-send 'Reminder' 'Call dentist'" | at 14:00 tomorrow
echo "notify-send 'Reminder' 'Submit report'" | at 09:00 next friday
```

With sound (if paplay/aplay available):
```
echo "notify-send 'Reminder' 'Meeting' && paplay /usr/share/sounds/freedesktop/stereo/bell.oga" | at 14:00
```

Check scheduled `at` jobs:
```
atq                         # list pending jobs
at -c <job-number>          # view job details
atrm <job-number>           # remove a job
```

### If no desktop environment (terminal only)

Write a message to the terminal using `wall` or a simple echo:
```
echo "wall 'REMINDER: Team standup!'" | at 09:55
```

Or use `write` if the user is logged in via a specific terminal.

### Recurring reminders (cron)

```
crontab -e
```

Add entries:
```
# Every weekday morning at 9am — daily standup reminder
0 9 * * 1-5 notify-send 'Daily' 'Time for standup'

# First of every month — invoice reminder
0 9 1 * * notify-send 'Monthly' 'Send invoices to clients'

# Every day at 5pm — end-of-day wrap up
0 17 * * 1-5 notify-send 'EOD' 'Write tomorrow''s task list'
```

Cron format: `minute hour day-of-month month day-of-week`

### View and manage reminders

```
atq                         # pending one-time reminders
crontab -l                  # recurring reminders
```

## Output format

```
REMINDER SET

Time:    Today at 14:00 (in 3h 20min)
Message: "Team standup in 5 minutes"

Job ID: 8 (remove with: atrm 8)
```

## Pitfalls

- `at` requires the `atd` daemon — check if it's running before trying to set reminders
- Desktop notifications only work if a notification daemon is running (dunst, mako, etc.)
- SSH sessions: `notify-send` won't work for remote sessions without X forwarding or Wayland
- Cron doesn't have access to `DISPLAY` env var by default — add `DISPLAY=:0` at the top of crontab for GUI notifications
- Times like "next friday" are interpreted relative to when the command runs

## Verification

After setting: run `atq` to confirm the job appears with the correct time.
