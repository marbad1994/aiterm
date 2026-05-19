---
name: logs
version: 1
---

# Log Analysis

Parse, search, and analyze log files to find errors, diagnose issues, and understand activity.

## When to use this skill

- User wants to find errors or exceptions in logs
- User wants to understand what happened at a specific time
- User wants to see activity patterns or anomalies
- User asks about "logs", "errors", "what happened", "why did it crash", "exceptions"

## Procedure

### Step 1: Locate the logs

Common log locations:
```
/var/log/syslog          # system log (Debian/Ubuntu)
/var/log/messages        # system log (RHEL/CentOS)
journalctl               # systemd journal (modern Linux)
/var/log/nginx/          # nginx access and error logs
/var/log/apache2/        # apache logs
~/.local/share/          # user application logs
./logs/                  # application-local logs
```

Check recent files:
```
ls -lt /var/log/ | head -20
find . -name "*.log" -newer /tmp -type f 2>/dev/null
```

### Step 2: Quick error scan

```
grep -i "error\|exception\|fatal\|critical\|panic\|fail" logfile.log | tail -50
```

For systemd:
```
journalctl -p err --since "1 hour ago"
journalctl -p err --since "2024-01-15 12:00" --until "2024-01-15 13:00"
```

### Step 3: Find errors around a specific time

```
grep "2024-01-15 14:3" logfile.log         # all events in that minute range
awk '/14:30/,/14:35/' logfile.log           # events between two times
```

### Step 4: Count error frequency

```
grep -i "error" logfile.log | awk '{print $5}' | sort | uniq -c | sort -rn | head -20
```

Find repeated error patterns:
```
grep -i "error" logfile.log | sed 's/[0-9]\{1,\}/N/g' | sort | uniq -c | sort -rn | head -20
```

(Replacing numbers with N normalizes "error on line 42" and "error on line 87" into the same pattern)

### Step 5: Analyze access logs (nginx/apache)

```
# Top requested URLs
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Top IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# HTTP errors (4xx, 5xx)
awk '$9 ~ /^[45]/' /var/log/nginx/access.log | tail -50

# Requests per minute (traffic pattern)
awk '{print $4}' /var/log/nginx/access.log | cut -d: -f1,2 | sort | uniq -c
```

### Step 6: Follow live logs

```
tail -f logfile.log                         # follow
tail -f logfile.log | grep -i error         # follow with filter
journalctl -f -u service-name              # follow systemd service
```

### Step 7: Application stack traces

For multi-line stack traces (Java, Python, Node.js):
```
# Python tracebacks
grep -A 20 "Traceback" logfile.log | head -100

# Node.js errors  
grep -A 10 "Error:" logfile.log | head -100

# Java exceptions
grep -A 15 "Exception" logfile.log | head -100
```

### Step 8: Large log files

For files too large to read entirely:
```
wc -l logfile.log                  # count lines
head -100 logfile.log              # first 100 lines
tail -500 logfile.log              # last 500 lines
grep -n "keyword" logfile.log | head -20  # find line numbers, then read_file with offset
```

## Output format

```
LOG ANALYSIS: /var/log/nginx/error.log (last 24h)

SUMMARY
Total log lines: 84,312
Error lines: 1,247 (1.5%)
Time range: 2024-01-14 14:00 → 2024-01-15 14:00

TOP ERRORS (by frequency)
  847×  "connect() failed (111: Connection refused) while connecting to upstream"
        → App server on :3000 was unreachable. Spikes at 02:15 and 09:45.
  312×  "open() failed (13: Permission denied) while reading upstream response header"
        → File permission issue. All from same endpoint: /api/export
   88×  "upstream timed out (110: Connection timed out)"
        → Occasional timeouts. Check if correlated with high load periods.

TIMELINE
  02:15-02:22  — 847 connection refused errors. App server crash/restart?
  09:45-09:47  — Another spike of 120 connection errors. Investigate restart cycle.

RECOMMENDED INVESTIGATION
1. Check what happened at 02:15 — look at app logs: journalctl -u myapp --since "02:10" --until "02:30"
2. Fix file permissions for /api/export endpoint
3. Set up process supervisor (systemd) to auto-restart app on crash
```

## Pitfalls

- Log timestamps may be in UTC — convert to local time before presenting to user
- Large log files: don't try to read them entirely — sample and search
- Some errors are expected/benign — distinguish new errors from known background noise
- Rotating logs: `logfile.log.1`, `.gz` files may contain relevant history; check if needed

## Verification

After identifying an error: confirm the error is real by reading the surrounding context (not just the error line in isolation).
