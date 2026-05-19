---
name: backup
version: 1
---

# Backup Management

Check backup status, run backups, verify integrity, and set up backup schedules.

## When to use this skill

- User wants to back up files or directories
- User wants to know when files were last backed up
- User wants to restore from a backup
- User mentions "backup", "rsync", "snapshot", "archive", "restore"

## Procedure

### Step 1: Assess current backup situation

Find existing backup tools and configs:
```
which rsync restic borg rclone timeshift 2>/dev/null
ls ~/.config/restic/ ~/.config/rclone/ 2>/dev/null
crontab -l 2>/dev/null | grep -i backup
systemctl list-units | grep -i backup
ls /etc/cron.*/*backup* 2>/dev/null
```

Also check if common backup destinations exist:
```
ls -la /backup/ /mnt/backup/ ~/Backups/ 2>/dev/null
```

### Step 2: Quick rsync backup (simplest)

Mirror a directory to a backup location:
```
rsync -av --progress ~/Documents/ /backup/documents/
rsync -av --delete ~/Documents/ /backup/documents/   # mirror (deletes old files)
```

Exclude certain paths:
```
rsync -av --exclude='.git' --exclude='node_modules' --exclude='*.log' \
  ~/projects/ /backup/projects/
```

To an external drive:
```
rsync -av ~/important/ /media/usb-drive/backup/
```

To a remote server:
```
rsync -av -e ssh ~/Documents/ user@remote-host:/backup/documents/
```

### Step 3: Restic (recommended for serious backups)

Restic provides deduplication, encryption, and snapshot management.

**Initialize a repository:**
```
restic init --repo /backup/restic-repo
restic init --repo sftp:user@host:/backup/restic-repo   # remote
restic init --repo s3:s3.amazonaws.com/bucket-name       # S3
```

**Run a backup:**
```
restic backup ~/Documents ~/projects --repo /backup/restic-repo
```

**List snapshots:**
```
restic snapshots --repo /backup/restic-repo
```

**Check when last backup ran and its status:**
```
restic snapshots --repo /backup/restic-repo --latest 5
```

**Verify integrity:**
```
restic check --repo /backup/restic-repo
```

**Restore:**
```
restic restore latest --repo /backup/restic-repo --target /tmp/restore
restic restore <snapshot-id> --repo /backup/restic-repo --include ~/Documents --target /
```

**Prune old backups:**
```
restic forget --repo /backup/restic-repo --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
```

### Step 4: Schedule automated backups

Add to crontab (`crontab -e`):
```
# Daily rsync backup at 2am
0 2 * * * rsync -a ~/Documents/ /backup/documents/ >> ~/logs/backup.log 2>&1

# Daily restic backup at 3am with pruning
0 3 * * * restic backup ~/Documents --repo /backup/restic-repo >> ~/logs/restic.log 2>&1
0 4 * * 0 restic forget --repo /backup/restic-repo --keep-daily 7 --keep-weekly 4 --prune
```

### Step 5: Check backup freshness

```
# Check when last backup completed
stat /backup/documents/ 2>/dev/null | grep Modify
ls -la /backup/documents/ | tail -5

# For restic
restic snapshots --repo /backup/restic-repo --latest 1 --json | \
  python3 -c "import json,sys; s=json.load(sys.stdin); print(s[0]['time'][:19] if s else 'No snapshots')"
```

## Output format

```
BACKUP STATUS

Last backup: 2024-01-14 03:02:13 (23 hours ago) ✓

RESTIC REPOSITORY: /backup/restic-repo
  Snapshots: 14 total
  Latest:    2024-01-14 03:02 — 23.4GB, 8,234 files
  Oldest:    2023-12-01 03:00 — 19.1GB (45 days ago)
  Repo size: 41.2GB on disk (deduplication active)

WHAT'S BACKED UP
  ~/Documents     ✓ last backup 23h ago
  ~/projects      ✓ last backup 23h ago
  ~/photos        ⚠️  NOT in backup config

SCHEDULE
  Daily at 03:00 (cron) ✓
  Weekly prune at 04:00 Sunday ✓

RECOMMENDED ACTIONS
• Add ~/photos to backup scope
• Last integrity check was 12 days ago — run: restic check
• Consider offsite backup (external drive or S3) for disaster recovery
```

## Pitfalls

- Test restores periodically — a backup you've never restored from is untested
- `rsync --delete` can delete files at destination if source accidentally loses files — use restic snapshots instead for protection
- External drives may not be mounted when scheduled backup runs — check cron logs
- Restic repositories need a password — store it safely (password manager, not in the script)
- Encrypting backups is important for cloud storage — restic encrypts by default

## Verification

After backup: verify at least one file from the backup is readable/restorable.
After setting up schedule: wait for one scheduled run and check the log for success.
