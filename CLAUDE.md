# TaskForge

TaskForge is the practice repository for the Claude Code tutorial series.
Choose one independent track for course exercises:

- `nextjs/`: full-stack Next.js application.
- `fastapi/`: FastAPI backend.

Before changing code, read the selected track's README and inspect its actual
scripts and project structure. Do not assume that a path or feature in one
track exists in the other.

## Verification

- Next.js: `cd nextjs && npm run verify`
- FastAPI: `cd fastapi && make verify`

Keep secrets and generated databases out of Git. Use feature branches, inspect
the diff, and run the selected track's complete verification suite before
committing.

This file is intentionally minimal. Tutorial 2 uses it as a starting point for
evidence-based project instructions.
