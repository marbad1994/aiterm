---
name: file-ops
version: 1
category: system
---

# File Operations & Organization

Bulk rename, reorganize, search, deduplicate, and manage files across directories.

## When to use this skill

- User wants to rename many files following a pattern
- User wants to organize files by type, date, or category
- User wants to find duplicate files
- User wants to find files matching certain criteria
- User mentions "rename files", "organize", "move files", "find duplicates", "bulk"

## Procedure

### Find files by criteria

```
find . -name "*.jpg" -type f                    # by extension
find . -name "*.log" -mtime +30 -type f         # older than 30 days
find . -size +50M -type f                        # larger than 50MB
find . -empty -type f                            # empty files
find . -newer reference.txt -type f              # modified after a file
find ~/Downloads -mtime +90 -type f              # old downloads
```

### Bulk rename files

**Preview first (ALWAYS preview before executing):**

Pattern-based rename with `rename` (Perl rename, common on Linux):
```
rename -n 's/old/new/' *.txt          # -n is dry run, shows what would change
rename 's/old/new/' *.txt             # actual rename
rename 's/ /_/g' *                    # replace spaces with underscores
rename 's/^/prefix_/' *.jpg           # add prefix
rename 's/\.jpeg$/.jpg/' *.jpeg       # normalize extension
```

With `mv` and a loop (when rename isn't available):
```
for f in *.txt; do mv -n "$f" "${f/old/new}"; done   # -n = no-clobber
```

Date-based rename (add date prefix):
```
for f in *.jpg; do
  date=$(stat -c %y "$f" | cut -d' ' -f1)
  mv -n "$f" "${date}_${f}"
done
```

### Organize files by type

```
mkdir -p organized/{images,documents,videos,audio,archives,other}

for f in *; do
  case "${f##*.}" in
    jpg|jpeg|png|gif|webp|svg) mv "$f" organized/images/ ;;
    pdf|doc|docx|odt|txt|md)  mv "$f" organized/documents/ ;;
    mp4|mkv|avi|mov|webm)     mv "$f" organized/videos/ ;;
    mp3|flac|wav|ogg|m4a)     mv "$f" organized/audio/ ;;
    zip|tar|gz|bz2|7z|rar)   mv "$f" organized/archives/ ;;
    *) [ -f "$f" ] && mv "$f" organized/other/ ;;
  esac
done
```

### Organize by date (year/month)

```
for f in *.jpg; do
  year=$(stat -c %y "$f" | cut -d'-' -f1)
  month=$(stat -c %y "$f" | cut -d'-' -f2)
  mkdir -p "$year/$month"
  mv -n "$f" "$year/$month/"
done
```

### Find and handle duplicates

Using `fdupes` (most reliable):
```
fdupes -r .                    # find duplicates recursively
fdupes -r -d .                 # interactively delete duplicates (keeps first)
fdupes -r -f . | tail -n +2   # list all but the first of each group
```

Without fdupes (using md5sum):
```
find . -type f -exec md5sum {} \; | sort | awk 'seen[$1]++ {print $2}' > duplicates.txt
cat duplicates.txt              # review before deleting
```

### Clean up specific file types

Find and remove old log files:
```
find . -name "*.log" -mtime +30 -exec ls -lh {} \;    # preview
find . -name "*.log" -mtime +30 -delete                # delete (careful!)
```

Find and compress old files:
```
find ~/Documents -mtime +365 -type f -exec gzip {} \;
```

### Sync or mirror directories

```
rsync -av --dry-run source/ destination/    # preview
rsync -av source/ destination/              # execute
rsync -av --delete source/ destination/     # mirror (deletes files not in source!)
```

## Output format

When previewing bulk operations, always show the full list of changes before asking the user to confirm:

```
PREVIEW: Rename 23 files (replace spaces with underscores)

  "my photo 001.jpg"     →  "my_photo_001.jpg"
  "my photo 002.jpg"     →  "my_photo_002.jpg"
  "meeting notes.docx"   →  "meeting_notes.docx"
  ... (20 more)

Proceed? This cannot be easily undone.
```

## Pitfalls

- **ALWAYS show a preview before executing bulk operations** — mistakes are hard to undo
- Use `-n` (no-clobber) with `mv` to prevent overwriting existing files
- `find -delete` is permanent — no trash. Use `ls` or move to a temp dir first
- `rsync --delete` will delete files at destination that don't exist at source — confirm this is intended
- Beware of files with spaces or special characters in names — always quote `"$f"` in loops
- Check available disk space before large copy/move operations: `df -h`

## Verification

After bulk rename: spot-check 3-5 files to confirm names are correct.
After organize: verify files landed in the right directories with `ls` on each output directory.
