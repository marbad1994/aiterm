---
name: sysmon
version: 1
category: system
---

# System Monitoring & Diagnostics

Monitor CPU, memory, disk, network, and processes to diagnose performance issues.

## When to use this skill

- User asks why the system or app is slow
- User wants to know what's using CPU, memory, or disk
- User wants to see which services or ports are running
- User asks about disk space, load average, or system health
- User mentions "slow", "hanging", "high CPU", "out of memory", "disk full"

## Procedure

### Quick system overview

```
uptime                    # load average (1/5/15 min)
free -h                   # memory: used/free/cached/swap
df -h                     # disk: used/available per filesystem
```

Interpreting load average: on an N-core system, load > N means the CPU is saturated.

### CPU analysis

**Top CPU consumers:**
```
ps aux --sort=-%cpu | head -15
```

**Real-time view:**
```
top -b -n 1 | head -30    # non-interactive snapshot
```

**CPU core usage:**
```
mpstat 1 3 2>/dev/null    # if sysstat installed
```

### Memory analysis

**Top memory consumers:**
```
ps aux --sort=-%mem | head -15
```

**Detailed memory:**
```
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Cached|SwapTotal|SwapFree"
```

If swap usage is high, the system is under memory pressure — find and fix the largest memory users.

### Disk analysis

**Disk usage by directory:**
```
du -sh /* 2>/dev/null | sort -rh | head -20
du -sh /var/* 2>/dev/null | sort -rh | head -10
du -sh /home/* 2>/dev/null | sort -rh
```

**Disk I/O (if iostat available):**
```
iostat -x 1 3 2>/dev/null
```

High `await` (>10ms) or high `%util` (>80%) indicates disk I/O bottleneck.

**Find large files:**
```
find / -type f -size +100M 2>/dev/null | sort -k5 -rn | head -20
find /var/log -name "*.log" -size +50M 2>/dev/null
```

### Network

**Listening ports and services:**
```
ss -tlnp         # listening TCP ports with process names
ss -ulnp         # listening UDP ports
```

Or with netstat (older systems):
```
netstat -tlnp 2>/dev/null
```

**Active connections:**
```
ss -tnp state established
```

**Network interface stats:**
```
ip -s link show
cat /proc/net/dev
```

### Process investigation

**Find a specific process:**
```
pgrep -la node
ps aux | grep nginx
```

**What files/sockets a process has open:**
```
lsof -p <pid>        # all open files
lsof -i :<port>      # who's listening on a port
```

**Process tree:**
```
pstree -p
```

### System logs

**Recent errors:**
```
journalctl -p err -n 50                    # last 50 errors (systemd)
journalctl -u service-name -n 100          # service-specific logs
tail -100 /var/log/syslog                  # traditional syslog
dmesg | tail -50                           # kernel messages
```

## Output format

```
SYSTEM HEALTH SNAPSHOT — 2024-01-15 14:32

CPU      Load: 3.2 / 3.8 / 4.1  (8 cores — 40–50% load, normal)
Memory   Used: 11.2GB / 16GB  Swap: 0.2GB / 4GB
Disk     /: 78% used (156GB / 200GB)  ⚠️ Getting full
         /data: 42% used (420GB / 1TB)

TOP CPU PROCESSES
  nginx (12 workers)   18% total
  node (pid 8234)      15%  ← main app
  postgres (pid 1203)   8%

TOP MEMORY PROCESSES
  node (pid 8234)      4.2GB  ← investigate if growing
  postgres (pid 1203)  2.1GB

SERVICES ON PORTS
  :80   nginx
  :443  nginx
  :3000 node
  :5432 postgres

⚠️  FINDINGS
• Disk at 78% — check /var/log for large log files: du -sh /var/log/*
• node process using 4.2GB memory — normal for this app? Check for memory leak if growing
• Load average stable — no CPU issue currently

RECOMMENDED ACTIONS
1. Check /var/log disk usage, rotate or archive old logs
2. Monitor node memory over next hour to detect leak
```

## Pitfalls

- High load average isn't always a problem — check if it's stable or trending up
- Disk full can cause cryptic application errors — always check this early in debugging
- `ps` shows point-in-time CPU — use `top` or repeated `ps` to see if usage is sustained
- Don't kill processes without understanding what they are first

## Verification

After taking action (e.g., freeing disk space): re-run `df -h` to confirm the issue is resolved.
