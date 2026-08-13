# TaskForge Next.js track summary

This directory is the full-stack web track for the TaskForge course project.
It is a runnable teaching baseline rather than a production starter.

## Stack

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Prisma 5 with SQLite
- NextAuth.js credentials authentication
- Tailwind CSS and Radix UI primitives
- Jest and React Testing Library

The exact resolved dependency versions are recorded in `package-lock.json`.

## Implemented baseline

- Development-only email and password authentication
- Owner-scoped project, task, and comment APIs with read-only viewer enforcement
- Project list and task-board screens
- Task status, priority, assignee, comments, and label data models
- Deterministic sample-data seed
- ESLint, TypeScript, Jest, build, and dependency-audit commands
- CI that starts from the committed lockfile and database migration

## Deliberate learning gaps

Tutorial exercises can build on this baseline by adding browser-level E2E and
accessibility testing, shared mutation helpers, label management screens, drag
and drop, search, rate limiting, observability, and production-grade auth.

Do not treat the demo credentials, SQLite database, or example secrets as
production-safe. See the repository-level security guidance.

## Commands

```bash
cp .env.example .env
npm ci
npm run db:setup
npm run dev
```

Run all automated checks with:

```bash
npm run verify
```

See `README.md` for the complete setup and sample accounts.
