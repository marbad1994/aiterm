# Contributing

Thanks for contributing to `shmakk`.

## Prerequisites
- Node.js 18+
- npm

## Local setup

```bash
npm install
npm run check
npm test
```

## Development

Run locally:

```bash
npm start
```

Debug mode:

```bash
npm run dev
```

## Global usage while developing

```bash
npm run global:link
```

Then use:

```bash
shmakk --help
```

Undo link:

```bash
npm run global:unlink
```

## Skills

The `skills/` directory contains task-specific markdown files that users can install via `shmakk --install-skill`. To add a skill, create a new `.md` file there following the pattern of existing skills and describe its purpose in the header.

## Coding guidelines
- Keep changes focused and minimal.
- Preserve existing behavior unless intentionally changing it.
- Prefer safe defaults and explicit confirmations for destructive actions.
- Add/update docs when behavior changes.
