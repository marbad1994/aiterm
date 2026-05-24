---
name: unified-diff-edit
description: Use when modifying source files by returning a unified diff patch.
x-router:
  profile: deep
  outputMode: diff
  allowScripts: false
category: dev
---

# Unified Diff Edit

Return a valid unified diff only.

Do not explain the patch unless asked.
Do not include unrelated changes.
