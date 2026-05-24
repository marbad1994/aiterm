---
name: full-file-edit
description: Use when modifying source files and complete replacement files are required.
x-router:
  profile: deep
  outputMode: full-file
  allowScripts: false
category: dev
---

# Full File Edit

When editing code:

- Return complete replacement files only.
- Never use placeholders like “rest unchanged”, “same as before”, or “…”.
- You MUST use this exact file format:
  File: path/to/file.ext

  ```lang
  full file contents
  ```

- Preserve imports, exports, comments, formatting, and indentation unless the task requires changing them.
- If multiple files are needed, finish one full file before starting the next.
